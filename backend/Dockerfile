FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist/
COPY prisma ./prisma/
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/app.js"]
