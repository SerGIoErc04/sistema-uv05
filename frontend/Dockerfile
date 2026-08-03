# ---------- Etapa de build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG API_URL=/api
RUN npx ng build --configuration production

# ---------- Etapa final: Nginx ----------
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
# El nombre de la carpeta de salida depende de angular.json (outputPath); ajustar si difiere
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
