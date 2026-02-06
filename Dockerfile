# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup Backend & Serve
FROM node:18-alpine
WORKDIR /app

# Copy backend files
COPY server/package*.json ./
RUN npm install --production

# Copy backend code
COPY server/server.js ./
COPY server/db ./db

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
