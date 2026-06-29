#!/bin/bash
# Install certbot renewal cron + deploy hook to reload nginx after renew.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="/etc/letsencrypt/renewal-hooks/deploy/tara-reload-nginx.sh"

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > "$HOOK" <<EOF
#!/bin/bash
cd ${PROJECT_DIR}
docker compose restart frontend
EOF
chmod +x "$HOOK"

CRON_LINE="0 3 * * * certbot renew --quiet --deploy-hook ${HOOK}"

if crontab -l 2>/dev/null | grep -q "certbot renew"; then
  echo "Certbot renew cron already installed"
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "Installed cron: $CRON_LINE"
fi

echo "Auto-renewal configured."
