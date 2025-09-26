# 轻量级 Open WebUI - 专注于内存优化 + PDF.js修复
FROM node:20-alpine AS frontend-builder

# 设置内存限制
ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NODE_ENV=production
WORKDIR /app

# 安装必要的系统工具
RUN apk add --no-cache git python3 make g++

# 复制 package 文件
COPY package.json package-lock.json* ./

# 分步骤安装依赖
RUN npm install --production --legacy-peer-deps
RUN npm install --include=dev --legacy-peer-deps

# 复制源码
COPY . .

# 🔧 直接修复有问题的文件
RUN echo "修复PDF导入问题..."
RUN sed -i '/pdfjs-dist.build.pdf.worker.mjs?url/d' src/lib/utils/index.ts
RUN sed -i '/import.*pdfWorkerUrl/a const pdfWorkerUrl = "";' src/lib/utils/index.ts

# 生成必要的配置文件
RUN npx svelte-kit sync

# 分阶段构建
RUN node --max_old_space_size=400 ./node_modules/vite/bin/vite.js build --mode production

# 后端 Python 环境
FROM python:3.11-alpine
WORKDIR /app

RUN apk add --no-cache build-base python3-dev
COPY ./backend/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt
COPY --from=frontend-builder /app/build ./build
COPY ./backend ./backend
RUN mkdir -p /app/backend/data

ENV NODE_ENV=production
ENV PORT=8080
ENV WEBUI_SECRET_KEY="lightweight-secure-key-2024"

EXPOSE 8080
CMD ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]