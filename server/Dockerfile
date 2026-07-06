FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/uploads

RUN mkdir -p /data/uploads

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma/
COPY --from=build /app/dist ./dist/
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma/

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
