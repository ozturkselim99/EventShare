import React, { useEffect, useState } from "react";

function App() {
  const path = window.location.pathname;

  if (path.startsWith("/event/")) {
    return <GuestPage />;
  }

  return <AdminPage />;
}

function AdminPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    ownerName: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    setEvents(JSON.parse(localStorage.getItem("events")) || []);
  }, []);

  const createEvent = () => {
    if (!form.title || !form.ownerName || !form.startDate || !form.endDate) {
      alert("Lütfen tüm alanları doldur.");
      return;
    }

    const eventId = Date.now().toString();
    const eventUrl = `http://192.168.1.103:5173/event/${eventId}`;

    const newEvent = {
      id: eventId,
      ...form,
      isActive: false,
      eventUrl,
      createdAt: new Date().toISOString(),
    };

    const updatedEvents = [...events, newEvent];
    localStorage.setItem("events", JSON.stringify(updatedEvents));
    setEvents(updatedEvents);

    setForm({
      title: "",
      ownerName: "",
      startDate: "",
      endDate: "",
    });
  };

  const toggleEventStatus = (eventId) => {
    const updatedEvents = events.map((event) => (event.id === eventId ? { ...event, isActive: !event.isActive } : event));

    localStorage.setItem("events", JSON.stringify(updatedEvents));
    setEvents(updatedEvents);
  };

  const deleteEvent = (eventId) => {
    const updatedEvents = events.filter((event) => event.id !== eventId);
    localStorage.setItem("events", JSON.stringify(updatedEvents));
    localStorage.removeItem(`media_${eventId}`);
    setEvents(updatedEvents);
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert("Link kopyalandı.");
  };

  const getQrUrl = (eventUrl, size = 200) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(eventUrl)}`;
  };

  const downloadQr = async (eventId, eventUrl) => {
    const qrUrl = getQrUrl(eventUrl, 700);
    const response = await fetch(qrUrl);
    const blob = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qr-${eventId}.png`;
    link.click();
  };

  return (
    <div style={styles.page}>
      <h1>QR Etkinlik Admin Paneli</h1>
      <p style={styles.subtitle}>Etkinlik oluştur, QR kod üret, etkinliği başlat ve misafir linkini paylaş.</p>

      <div style={styles.card}>
        <h2>Yeni Etkinlik Oluştur</h2>

        <input style={styles.input} placeholder="Etkinlik adı" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <input style={styles.input} placeholder="Etkinlik sahibi" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />

        <label>Başlangıç tarihi</label>
        <input style={styles.input} type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />

        <label>Bitiş tarihi</label>
        <input style={styles.input} type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />

        <button style={styles.primaryButton} onClick={createEvent}>
          QR Oluştur
        </button>
      </div>

      <h2>Etkinlikler</h2>

      {events.length === 0 && <p>Henüz etkinlik oluşturulmadı.</p>}

      {events.map((event) => {
        const mediaList = JSON.parse(localStorage.getItem(`media_${event.id}`)) || [];

        return (
          <div key={event.id} style={styles.eventCard}>
            <div style={styles.eventInfo}>
              <h3>{event.title}</h3>
              <p>Etkinlik sahibi: {event.ownerName}</p>
              <p>Başlangıç: {event.startDate}</p>
              <p>Bitiş: {event.endDate}</p>
              <p>Yüklenen medya sayısı: {mediaList.length}</p>

              <span style={event.isActive ? styles.activeBadge : styles.passiveBadge}>{event.isActive ? "Aktif" : "Pasif"}</span>

              <br />

              <a href={event.eventUrl} target="_blank">
                Misafir ekranını aç
              </a>
            </div>

            <div style={styles.qrArea}>
              <img src={getQrUrl(event.eventUrl, 180)} alt="QR Kod" style={styles.qrImage} />

              <button style={styles.secondaryButton} onClick={() => downloadQr(event.id, event.eventUrl)}>
                QR İndir
              </button>

              <button style={styles.secondaryButton} onClick={() => copyLink(event.eventUrl)}>
                Linki Kopyala
              </button>

              <button style={styles.primaryButton} onClick={() => toggleEventStatus(event.id)}>
                {event.isActive ? "Etkinliği Durdur" : "Etkinliği Başlat"}
              </button>

              <button style={styles.dangerButton} onClick={() => deleteEvent(event.id)}>
                Etkinliği Sil
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GuestPage() {
  const eventId = window.location.pathname.replace("/event/", "");
  const [event, setEvent] = useState(null);
  const [mediaList, setMediaList] = useState([]);

  useEffect(() => {
    const events = JSON.parse(localStorage.getItem("events")) || [];
    const selectedEvent = events.find((item) => item.id === eventId);

    setEvent(selectedEvent);

    const savedMedia = JSON.parse(localStorage.getItem(`media_${eventId}`)) || [];
    setMediaList(savedMedia);
  }, [eventId]);

  const uploadMedia = (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    const readers = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type.startsWith("video") ? "video" : "image",
            url: reader.result,
            uploadedAt: new Date().toISOString(),
          });
        };

        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newMedia) => {
      const updatedMedia = [...newMedia, ...mediaList];

      localStorage.setItem(`media_${eventId}`, JSON.stringify(updatedMedia));
      setMediaList(updatedMedia);

      alert("Yükleme başarılı.");
    });
  };

  if (!event) {
    return (
      <div style={styles.pageCenter}>
        <h1>Etkinlik bulunamadı</h1>
        <p>QR kod hatalı olabilir.</p>
      </div>
    );
  }

  if (!event.isActive) {
    return (
      <div style={styles.pageCenter}>
        <h1>{event.title}</h1>
        <p>Etkinlik henüz aktif değil.</p>
        <p>Lütfen etkinlik başladıktan sonra tekrar deneyiniz.</p>
      </div>
    );
  }

  return (
    <div style={styles.guestPage}>
      <div style={styles.hero}>
        <h1>{event.title}</h1>
        <p>{event.ownerName}</p>
        <p>Fotoğraf ve videolarınızı buradan paylaşabilirsiniz.</p>
      </div>

      <div style={styles.uploadCard}>
        <h2>Anını Paylaş</h2>
        <p style={styles.subtitle}>Fotoğraf veya video seçerek etkinlik galerisine yükleyebilirsin.</p>

        <label style={styles.uploadButton}>
          Fotoğraf / Video Seç
          <input type="file" accept="image/*,video/*" multiple onChange={uploadMedia} style={{ display: "none" }} />
        </label>
      </div>

      <h2>Etkinlik Galerisi</h2>

      {mediaList.length === 0 && <p style={styles.subtitle}>Henüz fotoğraf veya video yüklenmedi.</p>}

      <div style={styles.gallery}>
        {mediaList.map((media) => (
          <div key={media.id} style={styles.mediaCard}>
            {media.type === "image" ? <img src={media.url} alt={media.name} style={styles.media} /> : <video src={media.url} controls style={styles.media} />}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: 24,
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  guestPage: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 18,
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  pageCenter: {
    maxWidth: 600,
    margin: "0 auto",
    padding: 40,
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  subtitle: {
    color: "#6b7280",
  },
  card: {
    background: "#ffffff",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    padding: 14,
    margin: "8px 0 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
  },
  primaryButton: {
    width: "100%",
    padding: 13,
    marginTop: 10,
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#ffffff",
    color: "#111827",
    fontWeight: "bold",
    cursor: "pointer",
  },
  dangerButton: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  eventCard: {
    background: "#ffffff",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 20,
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
  },
  eventInfo: {
    flex: 1,
  },
  qrArea: {
    width: 200,
    textAlign: "center",
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  activeBadge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 20,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: "bold",
    marginBottom: 12,
  },
  passiveBadge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 20,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: "bold",
    marginBottom: 12,
  },
  hero: {
    background: "linear-gradient(135deg, #111827, #374151)",
    color: "#ffffff",
    padding: 28,
    borderRadius: 22,
    marginBottom: 20,
    textAlign: "center",
  },
  uploadCard: {
    background: "#ffffff",
    padding: 22,
    borderRadius: 18,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 24,
    textAlign: "center",
  },
  uploadButton: {
    display: "block",
    width: "100%",
    padding: 16,
    borderRadius: 14,
    background: "#111827",
    color: "#ffffff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  gallery: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 14,
  },
  mediaCard: {
    background: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    height: 180,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  media: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
};

export default App;
