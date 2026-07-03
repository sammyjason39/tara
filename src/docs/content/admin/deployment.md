# Staging & Production

TARA menggunakan dua environment terpisah untuk pengembangan aman.

## Environment

| | Production | Staging |
|---|------------|---------|
| URL | `tara.ralali.io` | `staging.tara.ralali.io` |
| Branch Git | `main` | `staging` |
| Database | Terpisah | Copy/snapshot dari prod |
| Deploy | Otomatis via GitHub Actions | Otomatis via GitHub Actions |

## Alur deploy (CI/CD)

```
Push ke branch staging  →  deploy otomatis ke staging VPS
Merge ke main           →  deploy otomatis ke production VPS
```

Workflow: `.github/workflows/deploy-staging.yml` dan `deploy-production.yml`.

## Aturan untuk tim

1. **Uji di staging dulu** sebelum merge ke `main`.
2. Jangan commit file `.env` — secrets hanya di server.
3. `SEED_ON_START=false` di production agar password tidak ter-reset.

## Refresh database staging

Untuk sync data staging dari production (opsional, via SSH ke VPS):

```bash
# Dump prod → restore staging (jalankan di VPS)
docker exec tara-db pg_dump -U postgres -Fc tara > /tmp/tara_prod.dump
docker exec -i tara-staging-db pg_restore -U postgres -d tara --clean --if-exists < /tmp/tara_prod.dump
```

## Header identifikasi

Response staging menyertakan header `X-Environment: staging` untuk membedakan dari production.
