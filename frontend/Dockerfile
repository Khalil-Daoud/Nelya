# Build stage
FROM node:20-alpine as build-step

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=build-step /app/dist/nelya-frontend /usr/share/nginx/html

# [BUG-009 FIX] Config Nginx avec try_files pour le routing Angular SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

