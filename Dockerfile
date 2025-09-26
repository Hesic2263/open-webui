# 轻量级 Open WebUI - 专为写作助手优化
FROM node:20-alpine AS frontend-builder

ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NODE_ENV=production
WORKDIR /app

# 安装必要的系统工具
RUN apk add --no-cache git python3 make g++

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm install --include=dev --legacy-peer-deps

# 复制源码
COPY . .

# 生成必要的配置文件
RUN npx svelte-kit sync

# 构建前端
RUN node --max_old_space_size=400 ./node_modules/vite/bin/vite.js build

# 后端 Python 环境
FROM python:3.11-alpine
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache build-base python3-dev

# 复制后端 requirements
COPY ./backend/requirements.txt ./

# 安装 Python 依赖
RUN pip3 install --no-cache-dir -r requirements.txt

# 复制前端构建结果
COPY --from=frontend-builder /app/build ./build

# 复制后端代码
COPY ./backend ./backend

# 创建数据目录
RUN mkdir -p /app/backend/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080
ENV WEBUI_SECRET_KEY="lightweight-secure-key-2024"

EXPOSE 8080

CMD ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]