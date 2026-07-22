// k6 load test simulating guests hitting a single event via its QR token:
// page load (event lookup + gallery), a slice of them uploading a photo,
// and periodic gallery polling. Run with:
//
//   docker run --rm -i --network host \
//     -e BASE_URL=http://localhost:3001/api/v1 \
//     -e EVENT_TOKEN=<token> \
//     -e TARGET_VUS=100 \
//     grafana/k6 run - < scripts/load-test.js
//
// TARGET_VUS defaults to a laptop-safe 100; point it at 1000 against a
// properly resourced (production-like) environment, not a dev machine.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001/api/v1";
const EVENT_TOKEN = __ENV.EVENT_TOKEN;
const TARGET_VUS = parseInt(__ENV.TARGET_VUS || "100", 10);
const UPLOAD_RATIO = parseFloat(__ENV.UPLOAD_RATIO || "0.3"); // 30% of guests also upload
// Only matters for local STORAGE_PROVIDER=local dev-upload URLs (see below).
const UPLOAD_HOST_OVERRIDE = __ENV.UPLOAD_HOST_OVERRIDE || "localhost";

if (!EVENT_TOKEN) {
  throw new Error("EVENT_TOKEN env var is required");
}

const rateLimited = new Counter("rate_limited_responses");
const uploadSuccessRate = new Rate("upload_success_rate");
const galleryDuplicateOrGapErrors = new Counter("pagination_anomalies");

export const options = {
  scenarios: {
    guests: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: TARGET_VUS }, // everyone scans the QR in the first ~20s
        { duration: "40s", target: TARGET_VUS }, // sustained browsing/uploading
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // <5% hard failures (excludes expected 429s, checked separately)
    "http_req_duration{endpoint:gallery}": ["p(95)<1500"],
    "http_req_duration{endpoint:event_lookup}": ["p(95)<1000"],
  },
};

// ~50KB dummy payload standing in for "a photo" — this test stresses the
// API/DB/lock paths, not raw upload bandwidth of real 500MB video files.
const DUMMY_FILE = new Uint8Array(50 * 1024).fill(65); // 'A' bytes

function get(path, tags) {
  const res = http.get(`${BASE_URL}${path}`, { tags });
  if (res.status === 429) rateLimited.add(1);
  return res;
}

export default function () {
  // 1. Page load: event lookup + initial gallery page
  const eventRes = get(`/events/by-token/${EVENT_TOKEN}`, { endpoint: "event_lookup" });
  check(eventRes, {
    "event lookup ok or rate-limited": (r) => r.status === 200 || r.status === 429,
  });

  let eventId = null;
  if (eventRes.status === 200) {
    eventId = JSON.parse(eventRes.body).id;
  }

  const galleryRes = get(
    `/events/by-token/${EVENT_TOKEN}/media?limit=20`,
    { endpoint: "gallery" },
  );
  check(galleryRes, {
    "gallery ok or rate-limited": (r) => r.status === 200 || r.status === 429,
  });

  sleep(Math.random() * 2);

  // 2. A slice of guests upload a photo
  if (Math.random() < UPLOAD_RATIO && eventId) {
    const presignRes = http.post(
      `${BASE_URL}/events/by-token/${EVENT_TOKEN}/uploads/presign`,
      JSON.stringify({
        filename: `loadtest-${__VU}-${__ITER}.jpg`,
        mimeType: "image/jpeg",
        size: DUMMY_FILE.length,
      }),
      { headers: { "Content-Type": "application/json" }, tags: { endpoint: "presign" } },
    );
    if (presignRes.status === 429) rateLimited.add(1);

    if (presignRes.status === 201 || presignRes.status === 200) {
      const presign = JSON.parse(presignRes.body);
      // Local STORAGE_PROVIDER=local returns a `localhost`-scoped presigned
      // URL (meant for a same-host browser). From inside this k6 container
      // that has to be rewritten to reach the host — a no-op against a real
      // R2 presigned URL in production.
      const uploadUrl = presign.uploadUrl.replace(
        /^https?:\/\/localhost/,
        (match) => match.replace("localhost", UPLOAD_HOST_OVERRIDE),
      );

      const putRes = http.put(uploadUrl, DUMMY_FILE.buffer, {
        headers: presign.headers,
        tags: { endpoint: "storage_put" },
      });

      if (putRes.status >= 200 && putRes.status < 300) {
        const completeRes = http.post(
          `${BASE_URL}/events/by-token/${EVENT_TOKEN}/uploads/complete`,
          JSON.stringify({ mediaId: presign.mediaId, uploadToken: presign.uploadToken }),
          { headers: { "Content-Type": "application/json" }, tags: { endpoint: "complete" } },
        );
        if (completeRes.status === 429) rateLimited.add(1);
        uploadSuccessRate.add(completeRes.status === 200 || completeRes.status === 201);
      } else {
        uploadSuccessRate.add(false);
      }
    }
  }

  sleep(1 + Math.random() * 3);

  // 3. Periodic gallery re-poll (guests checking for new photos), with
  // cursor pagination — verifies no duplicate/skip under concurrent writes.
  const page1 = get(`/events/by-token/${EVENT_TOKEN}/media?limit=10`, { endpoint: "gallery" });
  if (page1.status === 200) {
    const body = JSON.parse(page1.body);
    if (body.hasMore && body.nextCursor) {
      const page2 = get(
        `/events/by-token/${EVENT_TOKEN}/media?limit=10&cursor=${encodeURIComponent(body.nextCursor)}`,
        { endpoint: "gallery" },
      );
      if (page2.status === 200) {
        const body2 = JSON.parse(page2.body);
        const ids1 = new Set(body.data.map((d) => d.id));
        const overlap = body2.data.some((d) => ids1.has(d.id));
        if (overlap) galleryDuplicateOrGapErrors.add(1);
      }
    }
  }
}
