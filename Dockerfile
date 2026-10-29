FROM node:22-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
