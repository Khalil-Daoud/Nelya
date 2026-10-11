#!/bin/sh
set -e
export PORT="${PORT:-8080}"

# Une variable Railway vide n'est pas « unset » : le default ${VAR:-} ne s'applique pas.
# Sans schéma (http/https), nginx plante : invalid URL prefix.
raw="$(printf '%s' "${BACKEND_URL:-}" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
raw="${raw%/}"
case "$raw" in
  http://*|https://*) BACKEND_URL="$raw" ;;
  *:*) BACKEND_URL="http://$raw" ;;
  *.*) BACKEND_URL="https://$raw" ;;
  *) BACKEND_URL="https://nelya-production.up.railway.app" ;;
esac
export BACKEND_URL
echo "Nginx proxy BACKEND_URL=${BACKEND_URL} PORT=${PORT}"

sed -e "s|\${PORT}|${PORT}|g" -e "s|\${BACKEND_URL}|${BACKEND_URL}|g" \
  /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
