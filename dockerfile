# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS frontend-builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY ./frontend/package*.json ./
RUN npm install

COPY ./frontend ./

RUN echo "VITE_API_URL=$VITE_API_URL"

RUN npm run build


# ---------- BACKEND ----------
FROM node:20-alpine

WORKDIR /app

COPY ./backend/package*.json ./
RUN npm install

COPY ./backend ./

# Copy frontend build into backend
COPY --from=frontend-builder /app/dist ./public

EXPOSE 3000

CMD ["node", "server.js"]