# Cloudflare R2 Kurulum Rehberi

EventShare, medya dosyalarını Cloudflare R2 üzerinde saklar. Tarayıcıdan doğrudan R2'ye yükleme (presigned URL) ve worker ile görsel/video işleme bu bucket üzerinden çalışır.

## 1. Cloudflare Hesabı

1. https://dash.cloudflare.com/sign-up adresinden hesap oluşturun
2. Dashboard'a giriş yapın

## 2. R2 Bucket Oluşturma

1. Sol menüden **R2 Object Storage** → **Create bucket**
2. Bucket adı: `eventshare-media` (veya istediğiniz ad — `.env` içindeki `R2_BUCKET` ile eşleşmeli)
3. Location: Automatic
4. **Create bucket**

## 3. S3 API Credentials

1. R2 ana sayfasında **Manage R2 API Tokens** → **Create API token**
2. **Permissions:** Object Read & Write
3. **Specify bucket(s):** Oluşturduğunuz bucket'ı seçin
4. **Create API Token**

Kaydedin (bir daha gösterilmez):

| Değer | Env değişkeni |
|-------|----------------|
| Access Key ID | `R2_ACCESS_KEY_ID` |
| Secret Access Key | `R2_SECRET_ACCESS_KEY` |
| Account ID (token sayfasında) | `R2_ACCOUNT_ID` |

`R2_ENDPOINT` opsiyoneldir; `R2_ACCOUNT_ID` varsa otomatik üretilir:

```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

## 4. Bucket CORS (Zorunlu)

Tarayıcıdan doğrudan upload için bucket CORS ayarı gerekir.

1. Bucket → **Settings** → **CORS policy** → **Add CORS policy**
2. [`infra/r2/cors-policy.json`](../infra/r2/cors-policy.json) içeriğini yapıştırın
3. `YOUR_PROD_DOMAIN` yerine production domain'inizi yazın (ör. `eventshare.app`)
4. Local test için `http://localhost:3000` zaten şablonda var

## 5. Public Erişim (Galeri Görselleri)

Galeri, `R2_PUBLIC_BASE_URL` üzerinden public URL kullanır.

### Local / test (r2.dev)

1. Bucket → **Settings** → **Public access** → **Allow Access**
2. **R2.dev subdomain** etkinleştirin
3. Verilen URL'yi `.env` dosyasına yazın:

```env
R2_PUBLIC_BASE_URL=https://pub-xxxxxx.r2.dev
```

### Production (custom domain)

1. Domain'iniz Cloudflare'de yönetiliyorsa: Bucket → **Settings** → **Custom Domains** → **Connect Domain**
2. Örnek: `media.eventshare.app`
3. `.env` production:

```env
R2_PUBLIC_BASE_URL=https://media.eventshare.app
```

Production env şablonu: [`.env.production.example`](../.env.production.example)

## 6. Proje `.env` Yapılandırması

Proje kökünde `.env` dosyasını düzenleyin (commit etmeyin):

```env
STORAGE_PROVIDER=r2

R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=eventshare-media
R2_PUBLIC_BASE_URL=https://pub-xxxxxx.r2.dev
```

Local geliştirmede disk kullanmak için `STORAGE_PROVIDER=local` bırakabilirsiniz.

## 7. Çalıştırma ve Test

Önce R2 env doğrulaması (opsiyonel):

```bash
pnpm verify:r2
```

Ardından:

```bash
docker compose up -d postgres redis
pnpm dev
```

Test akışı:

1. http://localhost:3000/login — admin girişi
2. Yeni etkinlik oluştur, QR/link al
3. Public galeriden fotoğraf yükle
4. R2 bucket'ta `events/{eventId}/original/...` key oluştuğunu doğrula
5. Worker loglarında image processing görünmeli
6. Galeride görsel `R2_PUBLIC_BASE_URL` üzerinden yüklenmeli

## 8. Production Checklist

- [ ] Güçlü JWT ve NextAuth secret'ları (`openssl rand -base64 64`)
- [ ] `STORAGE_PROVIDER=r2`
- [ ] Custom domain (`media.*`) R2'ye bağlı
- [ ] CORS'ta production domain var
- [ ] API, Worker ve Web aynı R2 env değerlerini kullanıyor
- [ ] `.env` production sunucusunda; repoda değil

## Sorun Giderme

| Belirti | Olası neden |
|---------|-------------|
| Upload CORS hatası | Bucket CORS'ta `http://localhost:3000` veya prod domain eksik |
| API başlamıyor (`STORAGE_PROVIDER=r2`) | Eksik R2 env — hata mesajında hangi key eksik yazar |
| Galeri boş / kırık görsel | `R2_PUBLIC_BASE_URL` yanlış veya bucket public değil |
| Worker işlemiyor | Redis çalışıyor mu; worker'da da `STORAGE_PROVIDER=r2` olmalı |
