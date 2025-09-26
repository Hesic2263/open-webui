# 轻量级 Open WebUI - 专为写作助手优化
FROM node:20-alpine AS frontend-builder

# 设置内存限制和工作目录
ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NODE_ENV=production
WORKDIR /app

# 安装必要的系统工具（包括 git）
RUN apk add --no-cache git python3 make g++

# 复制 package 文件
COPY package.json package-lock.json* ./

# 清理缓存并安装依赖
RUN npm cache clean --force
RUN npm install --include=dev --legacy-peer-deps

# 复制源码
COPY . .

# 生成必要的 SvelteKit 配置文件
RUN npx svelte-kit sync

# 构建前端（增加重试机制）
RUN node --max_old_space_size=400 ./node_modules/vite/bin/vite.js build || \
    (echo "第一次构建失败，重试..." && node --max_old_space_size=400 ./node_modules/vite/bin/vite.js build)

# 后端 Python 环境
FROM python:3.11-alpine
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    build-base \
    python3-dev \
    && rm -rf /var/cache/apk/*

# 复制后端 requirements
COPY ./backend/requirements.txt ./

# 安装 Python 依赖（使用官方源，避免镜像问题）
RUN pip3 install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    pydantic==2.5.0 \
    python-multipart==0.0.6 \
    jinja2==3.1.2 \
    aiofiles==23.2.1 \
    sqlalchemy==2.0.23 \
    alembic==1.12.1

# 复制前端构建结果
COPY --from=frontend-builder /app/build ./build

# 复制后端代码
COPY ./backend ./backend

# 创建必要的数据目录
RUN mkdir -p /app/backend/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080
ENV WEBUI_SECRET_KEY="lightweight-secure-key-2024"
ENV OPENAI_API_KEY=""
ENV OPENAI_BASE_URL=""
ENV DEFAULT_MODEL="deepseek-chat"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]