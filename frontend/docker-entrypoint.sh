#!/bin/sh
set -e
export PORT="${PORT:-8080}"
# URL interne Railway (http://nelya.railway.internal:PORT) ou URL publique du backend.
export BACKEND_URL="${BACKEND_URL:-https://nelya-production.up.railway.app}"
BACKEND_URL="${BACKEND_URL%/}"
sed -e "s|\${PORT}|${PORT}|g" -e "s|\${BACKEND_URL}|${BACKEND_URL}|g" \
  /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
