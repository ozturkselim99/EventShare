# EventShare

Etkinlikler için fotoğraf ve video paylaşım platformu. Misafirler QR kod tarayarak etkinlik galerisine kolayca fotoğraf yükleyebilir, admin panelinden etkinlikler yönetilebilir.

## 🚀 Özellikler

- 📸 **Kolay Medya Paylaşımı** - QR kod ile hızlı erişim
- 🎨 **Modern Galeri** - Masonry grid layout ile responsive görünüm
- 👨‍💼 **Admin Paneli** - Etkinlik yönetimi ve medya kontrolü
- 🔒 **Güvenli** - JWT authentication, rate limiting
- ⚡ **Performanslı** - Redis cache, async media processing
- 📱 **Mobil Uyumlu** - Touch-friendly, progressive web app ready

## 🛠️ Teknoloji Stack

### Backend
- **NestJS** - Node.js framework
- **Prisma** - ORM ve database migrations
- **PostgreSQL** - İlişkisel veritabanı
- **Redis** - Cache ve queue management
- **Bull** - Background job processing

### Frontend
- **Next.js 15** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### DevOps
- **Docker** - Containerization
- **Turbo** - Monorepo build system
- **pnpm** - Paket yöneticisi

## 📋 Önkoşullar

Bilgisayarınızda şunlar yüklü olmalı:

- **Node.js** >= 22.x
- **pnpm** >= 9.x
- **Docker Desktop** (Postgres ve Redis için)
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
cd ss
```

### 2. Environment Variables Ayarlayın

```bash
# .env.example dosyasını kopyalayın
cp .env.example .env

# .env dosyasını düzenleyin (özellikle şunları değiştirin):
# - JWT_ACCESS_SECRET
# - JWT_REFRESH_SECRET
# - NEXTAUTH_SECRET
# - ADMIN_EMAIL (opsiyonel)
# - ADMIN_PASSWORD (opsiyonel)
```

**Geliştirme için varsayılan değerler yeterlidir.** Production'da mutlaka güçlü secret'lar kullanın:

```bash
# Güçlü secret oluşturmak için:
openssl rand -base64 64
```

### 3. Bağımlılıkları Yükleyin

```bash
pnpm install
```

### 4. Docker Konteynerlerini Başlatın

```bash
# Postgres ve Redis'i başlat
docker compose up -d postgres redis

# Kontrol et
docker ps
```

### 5. Database Setup

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
- 🌐 **Web (Next.js)**: http://localhost:3000
- 🔌 **API (NestJS)**: http://localhost:3001
- 🔄 **Worker**: Arka plan işleri
- 📦 **Shared**: Ortak tip tanımları (watch mode)

## 📁 Proje Yapısı

```
ss/
├── apps/
│   ├── api/          # NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/      # JWT authentication
│   │       │   ├── events/    # Event yönetimi
│   │       │   ├── media/     # Medya listesi
│   │       │   ├── uploads/   # Dosya yükleme
│   │       │   ├── qr/        # QR kod oluşturma
│   │       │   └── ...
│   │       └── main.ts
│   │
│   ├── web/          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (admin)/       # Admin paneli
│   │   │   ├── e/[token]/     # Public galeri
│   │   │   └── login/
│   │   └── components/
│   │
│   └── worker/       # Background job processor
│       └── src/
│           └── processors/
│
├── packages/
│   └── shared/       # Ortak TypeScript tipleri
│
├── prisma/
│   ├── schema.prisma # Database şeması
│   ├── migrations/   # Database migration'ları
│   └── seed.ts       # Seed data
│
└── docker-compose.yml
```

## 🎯 Kullanım

### Admin Paneli

1. http://localhost:3000/login adresine gidin
2. Seed ile oluşturduğunuz bilgilerle giriş yapın
3. "Yeni Etkinlik" oluşturun
4. QR kodu indirin veya linki paylaşın

### Misafir Erişimi

1. QR kodu tarayın veya `/e/{token}` linkine tıklayın
2. Fotoğraf/video yükleyin
3. Galeriyi görüntüleyin

## 🗄️ Database Komutları

```bash
# Prisma Studio (GUI)
pnpm db:studio

# Yeni migration oluştur
pnpm db:migrate

# Database'i sıfırla (dikkat!)
pnpm db:reset

# Production migration
pnpm db:migrate:deploy
```

## 🧪 Test

```bash
# Unit testler
pnpm test

# E2E testler
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 🏗️ Build

```bash
# Tüm projeyi build et
pnpm build

# Sadece API
pnpm --filter @eventshare/api build

# Sadece Web
pnpm --filter @eventshare/web build
```

## 🐳 Docker (Tam Stack)

```bash
# Tüm servisleri Docker ile çalıştır
docker compose up -d

# Logları izle
docker compose logs -f

# Durdur
docker compose down
```

**Not:** Docker build sırasında bazı monorepo path sorunları olabilir. Geliştirme için `pnpm dev` önerilir.

## 🔧 Sorun Giderme

### Port zaten kullanımda

```bash
# Windows'ta portları kontrol et
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Process'i kapat
taskkill /F /PID <pid>
```

### Docker bağlanamıyor

```bash
# Docker Desktop çalışıyor mu kontrol et
docker ps

# Konteynerleri yeniden başlat
docker compose restart postgres redis
```

### Prisma client hatası

```bash
# Client'ı yeniden oluştur
pnpm db:generate

# node_modules'ü temizle
rm -rf node_modules
pnpm install
```

### Migration hatası

```bash
# Migration durumunu kontrol et
npx prisma migrate status

# Database'i sıfırla (dikkat: tüm data silinir!)
pnpm db:reset
```

## 📝 Environment Variables

### Gerekli Değişkenler

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DATABASE_URL` | PostgreSQL bağlantı string'i | `postgresql://...` |
| `REDIS_URL` | Redis bağlantı string'i | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | JWT access token secret | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - |
| `NEXTAUTH_SECRET` | NextAuth secret | - |

### Opsiyonel Değişkenler

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `API_PORT` | API server port'u | `3001` |
| `APP_PUBLIC_URL` | Public URL (QR kod için) | `http://localhost:3000` |
| `STORAGE_PROVIDER` | Storage sağlayıcı (local/r2) | `local` |
| `MAX_IMAGE_SIZE_MB` | Max resim boyutu | `50` |
| `MAX_VIDEO_SIZE_MB` | Max video boyutu | `500` |

## 🚀 Production Deployment

### Environment Hazırlığı

1. Güçlü secret'lar oluşturun
2. `STORAGE_PROVIDER=r2` yapın (Cloudflare R2)
3. R2 credentials'ları ekleyin
4. `APP_PUBLIC_URL` ve `API_PUBLIC_URL`'i production domain'e ayarlayın

### Database

```bash
# Production migration
pnpm db:migrate:deploy

# Admin oluştur (production credentials ile)
ADMIN_EMAIL=admin@domain.com ADMIN_PASSWORD=<güçlü-şifre> pnpm db:seed
```

### Build & Deploy

```bash
# Build
pnpm build

# Start (PM2, Docker, vb. ile)
pnpm start
```

## 📚 API Endpoints

### Public
- `GET /api/v1/events/by-token/:token` - Event bilgisi
- `GET /api/v1/events/by-token/:token/media` - Galeri
- `POST /api/v1/events/by-token/:token/uploads/presign` - Upload URL
- `POST /api/v1/events/by-token/:token/uploads/complete` - Upload tamamla

### Admin (Auth Required)
- `POST /api/v1/auth/login` - Giriş yap
- `GET /api/v1/auth/me` - Kullanıcı bilgisi
- `GET /api/v1/admin/events` - Event listesi
- `POST /api/v1/admin/events` - Event oluştur
- `GET /api/v1/admin/events/:id/qr.png` - QR kod (PNG)
- `GET /api/v1/admin/events/:id/qr.pdf` - QR kod (PDF)

API dokümantasyonu: http://localhost:3001/api/docs (Swagger)

## 🤝 Katkıda Bulunma

1. Fork'layın
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit'leyin (`git commit -m 'feat: add amazing feature'`)
4. Push'layın (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

[MIT License](LICENSE)

## 🆘 Destek

Sorun yaşıyorsanız:
1. Issue açın
2. Detaylı açıklama ve error log'ları ekleyin
3. Environment bilgilerinizi paylaşın (hassas bilgiler hariç)
