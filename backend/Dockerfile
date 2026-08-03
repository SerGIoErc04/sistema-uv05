# ---------- Etapa de dependencias ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Etapa final ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Usuario no-root por seguridad
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/uploads && chown -R nodeusr:nodegrp /app

USER nodeusr

EXPOSE 3000
CMD ["node", "src/server.js"]
