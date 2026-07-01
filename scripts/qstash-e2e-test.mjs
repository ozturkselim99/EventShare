// QStash end-to-end smoke test:
// login -> create event -> presign -> PUT to R2 -> complete (publish to QStash)
// -> QStash delivers to worker -> worker processes -> media READY
const API = "http://localhost:3001/api/v1";

// 1x1 PNG
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/IePAAAAAElFTkSuQmCC";
const pngBytes = Buffer.from(PNG_BASE64, "base64");

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  // 1. Login
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "admin@eventshare.app",
      password: "Admin1234!",
    }),
  });
  const login = await json(loginRes);
  const accessToken = login.accessToken ?? login.access_token;
  if (!accessToken) throw new Error(`Login failed: ${JSON.stringify(login)}`);
  console.log("✓ Login OK");

  // 2. Create event
  const eventRes = await fetch(`${API}/admin/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: "QStash E2E Test",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  const event = await json(eventRes);
  if (!event.id || !event.token)
    throw new Error(`Event create failed: ${JSON.stringify(event)}`);
  console.log(`✓ Event created: ${event.id} (token=${event.token})`);

  // 3. Presign
  const presignRes = await fetch(
    `${API}/events/by-token/${event.token}/uploads/presign`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "e2e.png",
        mimeType: "image/png",
        size: pngBytes.length,
      }),
    },
  );
  const presign = await json(presignRes);
  if (!presign.uploadUrl)
    throw new Error(`Presign failed: ${JSON.stringify(presign)}`);
  console.log(`✓ Presigned: media=${presign.mediaId}`);

  // 4. PUT to R2
  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { ...(presign.headers ?? {}), "content-type": "image/png" },
    body: pngBytes,
  });
  if (!putRes.ok)
    throw new Error(`R2 PUT failed: ${putRes.status} ${await putRes.text()}`);
  console.log(`✓ Uploaded to R2 (${putRes.status})`);

  // 5. Complete -> publishes to QStash
  const completeRes = await fetch(
    `${API}/events/by-token/${event.token}/uploads/complete`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId: presign.mediaId,
        uploadToken: presign.uploadToken,
      }),
    },
  );
  const complete = await json(completeRes);
  console.log(`✓ Complete -> published: ${JSON.stringify(complete)}`);

  // 6. Poll media status until READY
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const listRes = await fetch(`${API}/admin/events/${event.id}/media`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const list = await json(listRes);
    const items = list.items ?? list.data ?? list;
    const media = Array.isArray(items)
      ? items.find((m) => m.id === presign.mediaId)
      : null;
    if (media) {
      console.log(`  [${i + 1}s] status=${media.status}`);
      if (media.status === "READY") {
        console.log(`\n✅ SUCCESS: media READY`);
        console.log(`   originalUrl: ${media.originalUrl}`);
        console.log(`   thumbnailUrl: ${media.thumbnailUrl}`);
        process.exit(0);
      }
      if (media.status === "FAILED") {
        throw new Error("Media processing FAILED");
      }
    }
  }
  throw new Error("Timeout: media did not become READY in 30s");
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
