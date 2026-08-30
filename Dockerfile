# 智慧仓储管理系统 · 单容器一体化镜像
# 构建：docker build -t wms:latest .
# 运行：docker run -d -p 80:3000 -v /data/wms:/app/data -e JWT_SECRET=xxx --name wms wms:latest

# ---------- 构建阶段 ----------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /build

# 后端构建
COPY backend/package.json backend/pnpm-lock.yaml* ./backend/
RUN cd backend && pnpm install --frozen-lockfile
COPY backend ./backend
RUN cd backend && pnpm build

# 前端构建
COPY frontend/package.json frontend/pnpm-lock.yaml* ./frontend/
RUN cd frontend && pnpm install --frozen-lockfile
COPY frontend ./frontend
RUN cd frontend && pnpm build

# ---------- 运行阶段 ----------
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# 拷贝后端产物 + 依赖
COPY --from=builder /build/backend/dist ./dist
COPY --from=builder /build/backend/package.json ./
COPY --from=builder /build/backend/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# 拷贝前端静态文件（后端 app.ts 会自动托管 ./public）
COPY --from=builder /build/frontend/dist ./public

# 数据卷：SQLite 数据库文件持久化
VOLUME ["/app/data"]

ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=/api

EXPOSE 3000
CMD ["node", "dist/index.js"]
