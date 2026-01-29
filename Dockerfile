FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

# copy prisma config + schema before generating
COPY prisma.config.ts ./
COPY src/prisma ./src/prisma

ARG DATABASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SECRET_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SECRET_KEY=$SUPABASE_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL

# generate prisma client
RUN npx prisma generate --schema=src/prisma/schema.prisma

# copy the rest and build next
COPY . .
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

# include prisma schema (useful for migrate deploy in-container if you ever do it)
COPY --from=builder /app/src/prisma ./src/prisma

# include generated prisma engines/artifacts
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

EXPOSE 3000
CMD ["npm", "start", "--", "-p", "3000"]
