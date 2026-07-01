# QStash Kurulum Rehberi

EventShare, medya işleme (thumbnail/optimize/video preview) için **Upstash QStash** kullanır. QStash, HTTP tabanlı bir job queue'dur: API bir mesaj publish eder, QStash bunu worker'ın HTTP endpoint'ine (`POST /jobs/media`) iletir.

## Mimari

```
API (uploads/complete)
   -> QStash publishJSON
QStash
   -> HTTP POST /jobs/media (imzalı)
Worker (:3002)
   -> imza doğrula -> medya işle -> DB güncelle
```

Worker artık Redis dinleyen bir process değil; **public erişilebilir bir HTTP servisi**.

## 1. Local Geliştirme

QStash bulut servisi `localhost`'a erişemez. Local için QStash **dev server** kullanılır.

### Dev server başlat

Ayrı bir terminalde:

```bash
pnpm qstash:dev
# veya
npx @upstash/qstash-cli dev
```

Çıktıda default user kimlik bilgileri görünür. Bunlar deterministiktir ve `.env.example` içinde hazır gelir:

```env
QSTASH_URL=http://127.0.0.1:8080
QSTASH_TOKEN=eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=
QSTASH_CURRENT_SIGNING_KEY=sig_7kYjw48mhY7kAjqNGcy6cr29RJ6r
QSTASH_NEXT_SIGNING_KEY=sig_5ZB6DVzB1wjE8S6rZ7eenA8Pdnhs
```

### Çalıştırma sırası

```bash
docker compose up -d postgres   # Redis artık gerekmiyor
pnpm qstash:dev                  # ayrı terminal
pnpm dev                         # web + api + worker + shared
```

Akış: API `WORKER_PUBLIC_URL=http://localhost:3002` adresine publish eder; QStash dev server localhost'a POST atabilir.

## 2. Environment Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `QSTASH_TOKEN` | Publish için token (local: dev token, prod: Upstash Console) |
| `QSTASH_URL` | Dev server URL'i; production'da **boş** bırakılır (managed QStash) |
| `QSTASH_CURRENT_SIGNING_KEY` | Worker imza doğrulama |
| `QSTASH_NEXT_SIGNING_KEY` | Worker imza doğrulama (key rotasyonu) |
| `WORKER_PORT` | Worker HTTP portu (varsayılan 3002) |
| `WORKER_PUBLIC_URL` | QStash'in çağıracağı worker base URL'i |

İmza doğrulamayı geçici devre dışı bırakmak için (yalnızca izole test): `QSTASH_VERIFY=false`.

## 3. Production

### Upstash QStash credentials

1. https://console.upstash.com/qstash adresine girin
2. **QSTASH_TOKEN**'ı kopyalayın
3. **Signing keys** bölümünden `current` ve `next` key'leri alın
4. Production `.env`'e ekleyin (`.env.production.example` şablonu)

```env
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...
# QSTASH_URL boş bırakılır
WORKER_PUBLIC_URL=https://worker.eventshare.app
```

### Worker public erişim

QStash buluttan worker'a HTTP POST attığı için worker **public HTTPS** olmalı:

- Cloudflare Tunnel ile `worker.DOMAIN` -> `localhost:3002`
- veya reverse proxy arkasında worker servisi

`WORKER_PUBLIC_URL` bu adrese ayarlanır. QStash imzayı doğrulamak için signing key'ler worker'da tanımlı olmalı.

## 4. Test

1. `pnpm qstash:dev` + `pnpm dev`
2. http://localhost:3000 -> etkinlik oluştur -> fotoğraf yükle
3. Worker logunda `Processing job process-image ...` ve `processing complete` görünür
4. Galeride görsel R2 public URL üzerinden yüklenir

## Sorun Giderme

| Belirti | Olası neden |
|---------|-------------|
| Worker `Invalid QStash signature` | Signing key'ler eşleşmiyor; dev server'ı yeniden başlatıp değerleri güncelleyin |
| Job worker'a hiç gelmiyor | `WORKER_PUBLIC_URL` yanlış; QStash dev server çalışmıyor; veya `QSTASH_URL` ayarlı değil |
| `QStash signing keys not configured` | `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` eksik |
| Büyük video timeout | QStash istek timeout limiti; ffmpeg süresi uzun olabilir |
| Free tier limit | Günlük mesaj limiti aşıldı (Upstash plan) |
