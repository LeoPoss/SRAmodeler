# Stage 1: Build
FROM node:26-alpine AS build
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Release  
FROM node:26-alpine
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --omit=dev && npm install drizzle-kit tsx

COPY --from=build /usr/src/app/.output ./.output
COPY --from=build /usr/src/app/src/db ./src/db
COPY --from=build /usr/src/app/src/lib/demos.ts ./src/lib/demos.ts
COPY --from=build /usr/src/app/src/lib/mapping.json ./src/lib/mapping.json
COPY --from=build /usr/src/app/drizzle.config.ts ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh && mkdir -p /data && ln -sf /data/sra.db /usr/src/app/sra.db

ENV PORT=80
EXPOSE 80
ENTRYPOINT ["./entrypoint.sh"]
