# EventShare

Etkinlikler için fotoğraf ve video paylaşım platformu. Misafirler QR kod tarayarak etkinlik galerisine kolayca fotoğraf yükleyebilir, admin panelinden etkinlikler yönetilebilir.

## 🚀 Özellikler

- 📸 **Kolay Medya Paylaşımı** - QR kod ile hızlı erişim
- 🎨 **Modern Galeri** - Masonry grid layout ile responsive görünüm, upload sonrası otomatik yenileme
- 👨‍💼 **Admin Paneli** - Etkinlik yönetimi, medya kontrolü ve toplu indirme
- 🔒 **Güvenli** - JWT authentication, rate limiting, QStash imza doğrulama
- ⚡ **Performanslı** - QStash ile HTTP tabanlı async media processing (Redis yok)
- ☁️ **Cloudflare R2** - S3 uyumlu nesne depolama (yerel ve production)
- 📱 **Mobil Uyumlu** - Touch-friendly, progressive web app ready

## 🛠️ Teknoloji Stack

### Backend
- **NestJS** - Node.js framework (API + Worker, iki ayrı servis)
- **Prisma** - ORM ve database migrations
- **PostgreSQL** - İlişkisel veritabanı
- **Upstash QStash** - HTTP tabanlı job queue (background media processing)
- **Cloudflare R2** - S3 uyumlu nesne depolama

### Frontend
- **Next.js 15** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### DevOps
- **Docker** - Containerization (sadece Postgres)
- **Turbo** - Monorepo build system
- **pnpm** - Paket yöneticisi

## 📋 Önkoşullar

Bilgisayarınızda şunlar yüklü olmalı:

- **Node.js** >= 22.x
- **pnpm** >= 9.x
- **Docker Desktop** (Postgres için)
- **Git**

### pnpm Kurulumu

```bash
# npm ile
npm install -g pnpm

# veya corepack ile (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

## 🚀 Kurulum

### 1. Repoyu Klonlayın

```bash
git clone <repo-url>
cd EventShare-main
```

### 2. Environment Variables Ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasında düzenleyin:

| Değişken | Açıklama |
|----------|----------|
| `JWT_ACCESS_SECRET` | Güçlü rastgele string (`openssl rand -base64 64`) |
| `JWT_REFRESH_SECRET` | Güçlü rastgele string |
| `NEXTAUTH_SECRET` | Güçlü rastgele string |
| `STORAGE_PROVIDER` | `local` (geliştirme) veya `r2` (production) |

R2 kullanmak için ek değişkenler: [`docs/r2-setup.md`](docs/r2-setup.md)

### 3. Bağımlılıkları Yükleyin

```bash
pnpm install
```

### 4. Postgres'i Başlatın

```bash
docker compose up -d postgres

# Kontrol et
docker ps
```

### 4b. QStash Local Dev Server'ı Başlatın

Medya işleme QStash üzerinden yapılır. **Ayrı bir terminalde** çalıştırın:

```bash
pnpm qstash:dev
```

Çıktıdaki kimlik bilgileri `.env.example` içindeki default değerlerle birebir aynıdır — ek ayar gerekmez. Detay: [`docs/qstash-setup.md`](docs/qstash-setup.md)

### 5. Database Kurulumu

```bash
# Prisma client oluştur
pnpm db:generate

# Migration'ları çalıştır
pnpm db:migrate

# Admin kullanıcısı oluştur
pnpm db:seed
```

**Varsayılan admin bilgileri:**
- Email: `admin@eventshare.app`
- Şifre: `Admin1234!`

### 6. Geliştirme Sunucusunu Başlatın

```bash
pnpm dev
```

Bu komut şunları başlatır:

| Servis | URL | Açıklama |
|--------|-----|----------|
| 🌐 Web (Next.js) | http://localhost:3000 | Kullanıcı arayüzü |
| 🔌 API (NestJS) | http://localhost:3001 | REST API |
| 🔄 Worker (HTTP) | http://localhost:3002 | QStash job endpoint |
| 📦 Shared | - | Ortak tip tanımları (watch mode) |

> QStash dev server ayrı çalışmalıdır (adım 4b).

## 📁 Proje Yapısı

```
EventShare-main/
├── apps/
│   ├── api/                    # NestJS REST API (:3001)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # JWT authentication
│   │       │   ├── events/     # Etkinlik yönetimi
│   │       │   ├── media/      # Galeri & medya
│   │       │   ├── uploads/    # Presign & complete
│   │       │   ├── queue/      # QstashService (job publish)
│   │       │   ├── storage/    # Local / R2 adapter
│   │       │   └── qr/         # QR kod oluşturma
│   │       └── config/
│   │
│   ├── web/                    # Next.js frontend (:3000)
│   │   ├── app/
│   │   │   ├── (admin)/        # Admin paneli
│   │   │   └── e/[token]/      # Public galeri
│   │   └── components/
│   │       ├── gallery/        # MasonryGallery, Lightbox
│   │       └── upload/         # UploadZone
│   │
│   └── worker/                 # HTTP Worker (:3002)
│       └── src/
│           ├── jobs/           # JobsController, QstashSignatureGuard
│           └── services/       # MediaProcessingService, ImageService, VideoService
│
├── packages/
│   └── shared/                 # Ortak TypeScript tipleri & yardımcılar
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docs/
│   ├── r2-setup.md             # Cloudflare R2 kurulum rehberi
│   └── qstash-setup.md         # QStash kurulum rehberi
│
├── scripts/
│   └── verify-r2-env.ts        # R2 env doğrulama scripti
│
└── docker-compose.yml          # Postgres servisi
```

## 🎯 Kullanım

### Admin Paneli

1. http://localhost:3000 → otomatik `/login` sayfasına yönlendirir
2. Seed ile oluşturulan bilgilerle giriş yapın
3. **Yeni Etkinlik** oluşturun, tarih ve süre belirleyin
4. QR kodu indirin veya `/e/{token}` linkini paylaşın
5. Yüklenen medyaları admin panelinden yönetin, toplu indirin

### Misafir Erişimi

1. QR kodu tarayın veya `/e/{token}` linkine gidin
2. Fotoğraf veya video seçin, yükleyin
3. Yükleme tamamlandığında **"Medya işleniyor..."** göstergesi çıkar
4. Worker işlemi bitince galeri otomatik yenilenir (genellikle 2-3 saniye)

## 🏗️ Mimari

```
Kullanıcı
  → R2 (presigned PUT, doğrudan yükleme)
  → API /uploads/complete
      → QStash publishJSON
          → Worker POST /jobs/media (imzalı HTTP)
              → ImageService / VideoService (sharp / ffmpeg)
              → R2 (thumbnail, variant)
              → PostgreSQL (status: READY)
  → Galeri polling → READY → sayfa yenileme
```

**Redis yoktur.** QStash job queue + imza doğrulaması + otomatik retry sağlar.

## 🗄️ Database Komutları

```bash
pnpm db:generate       # Prisma client oluştur
pnpm db:migrate        # Migration çalıştır (geliştirme)
pnpm db:migrate:deploy # Migration çalıştır (production)
pnpm db:seed           # Admin kullanıcısı oluştur
pnpm db:studio         # Prisma Studio (GUI)
pnpm db:reset          # Database'i sıfırla (dikkat: tüm data silinir!)
```

## 🔧 Faydalı Scriptler

```bash
pnpm verify:r2    # R2 ortam değişkenlerini doğrula
pnpm qstash:dev   # QStash local dev server'ı başlat
pnpm build        # Tüm projeyi build et
```

## 🏗️ Build

```bash
pnpm build

# Tek servis
pnpm --filter @eventshare/api build
pnpm --filter @eventshare/web build
pnpm --filter @eventshare/worker build
```

## 🐳 Docker (Tam Stack)

```bash
docker compose up -d
docker compose logs -f
docker compose down
```

> Not: Docker Compose sadece Postgres içerir. QStash dev server host üzerinde çalışmalıdır.

## 🔧 Sorun Giderme

### Galeri fotoğrafı göstermiyor

Yükleme sonrası **"Medya işleniyor..."** göstergesi çıkmıyorsa:
- QStash dev server çalışıyor mu? (`pnpm qstash:dev`)
- Worker ayakta mı? (`curl http://localhost:3002/health`)
- Worker loglarında `processing complete` var mı?

### Port zaten kullanımda

```bash
# macOS/Linux
lsof -ti :3000 -ti :3001 -ti :3002 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /F /PID <pid>
```

### Docker bağlanamıyor

```bash
# Docker Desktop çalışıyor mu?
docker ps

# Postgres'i yeniden başlat
docker compose restart postgres
```

### Prisma / Migration hatası

```bash
pnpm db:generate
rm -rf node_modules && pnpm install
```

## 📝 Environment Variables

### Gerekli

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DATABASE_URL` | PostgreSQL bağlantı string'i | `postgresql://eventshare:eventshare_secret@localhost:5433/eventshare` |
| `JWT_ACCESS_SECRET` | JWT access token secret | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - |
| `NEXTAUTH_SECRET` | NextAuth session secret | - |
| `QSTASH_TOKEN` | QStash publish token | Dev: `.env.example` default değeri |
| `QSTASH_URL` | QStash server URL'i | `http://127.0.0.1:8080` (local dev) |
| `QSTASH_CURRENT_SIGNING_KEY` | Worker imza doğrulama | Dev: `.env.example` default değeri |
| `QSTASH_NEXT_SIGNING_KEY` | Worker imza doğrulama (rotasyon) | Dev: `.env.example` default değeri |
| `WORKER_PUBLIC_URL` | QStash'in çağıracağı worker URL'i | `http://localhost:3002` |

### Opsiyonel

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `API_PORT` | API port'u | `3001` |
| `WORKER_PORT` | Worker port'u | `3002` |
| `APP_PUBLIC_URL` | Public URL (QR kod için) | `http://localhost:3000` |
| `STORAGE_PROVIDER` | `local` veya `r2` | `local` |
| `MAX_IMAGE_SIZE_MB` | Maksimum resim boyutu | `50` |
| `MAX_VIDEO_SIZE_MB` | Maksimum video boyutu | `500` |

### Cloudflare R2 (STORAGE_PROVIDER=r2)

| Değişken | Açıklama |
|----------|----------|
| `R2_ACCOUNT_ID` | Cloudflare hesap ID |
| `R2_ACCESS_KEY_ID` | R2 API token (Access Key ID) |
| `R2_SECRET_ACCESS_KEY` | R2 API token (Secret Access Key) |
| `R2_BUCKET` | Bucket adı |
| `R2_PUBLIC_BASE_URL` | Bucket public URL (ör. `https://media.domain.com`) |

Detaylı kurulum: [`docs/r2-setup.md`](docs/r2-setup.md)

## 🚀 Production Deployment

1. Cloudflare R2 bucket oluşturun → [`docs/r2-setup.md`](docs/r2-setup.md)
2. Upstash QStash projesi oluşturun → [`docs/qstash-setup.md`](docs/qstash-setup.md)
3. Worker'ı public HTTPS ile yayına alın (Cloudflare Tunnel veya reverse proxy)
4. `.env.production.example` şablonunu kullanarak production env'i hazırlayın
5. Migration çalıştırın: `pnpm db:migrate:deploy`
6. Admin kullanıcısı oluşturun: `ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm db:seed`
7. Build alın ve deploy edin: `pnpm build`

## 📚 API Endpoints

### Public
- `GET  /api/v1/events/by-token/:token` — Event bilgisi
- `GET  /api/v1/events/by-token/:token/media` — Galeri (cursor pagination, yalnızca READY medya)
- `POST /api/v1/events/by-token/:token/uploads/presign` — Presigned upload URL
- `POST /api/v1/events/by-token/:token/uploads/complete` — Upload tamamla (QStash job publish)

### Admin (Auth Required)
- `POST /api/v1/auth/login` — Giriş
- `GET  /api/v1/auth/me` — Kullanıcı bilgisi
- `GET  /api/v1/admin/events` — Etkinlik listesi
- `POST /api/v1/admin/events` — Etkinlik oluştur
- `GET  /api/v1/admin/events/:id/qr.png` — QR kod (PNG)
- `GET  /api/v1/admin/events/:id/qr.pdf` — QR kod (PDF)
- `GET  /api/v1/admin/events/:eventId/download` — Tüm medyayı ZIP indir

### Worker (Internal — QStash imzalı)
- `GET  /health` — Servis durumu
- `POST /jobs/media` — Medya işleme job'u (QStash tarafından tetiklenir)

Swagger UI: http://localhost:3001/api/docs

## 📄 Lisans

[MIT License](LICENSE)
