# --- Build stage ---
FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma

RUN npx prisma generate

COPY src ./src
RUN npm run build


# --- Runtime stage ---
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist

# Wygenerowany Prisma Client i silniki
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI potrzebne do wykonania migracji przy starcie
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

COPY prisma ./prisma

EXPOSE 3000

# Migracje tworzą schemat, a seed idempotentnie gwarantuje dane bazowe
# (języki + kurs pl-hr) przy każdym starcie świeżej bazy.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node prisma/seed.js && node dist/main.js"]
