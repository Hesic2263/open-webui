# 轻量级 Open WebUI - 专为写作助手优化
FROM node:18-alpine AS frontend-builder

# 设置内存限制
ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NODE_ENV=production

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 复制源码并构建
COPY . .
RUN npm run build

# 后端 Python 环境
FROM python:3.11-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    git \
    build-base \
    python3-dev \
    && rm -rf /var/cache/apk/*

# 复制后端 requirements
COPY ./backend/requirements.txt ./

# 安装 Python 依赖
RUN pip3 install --no-cache-dir uv && \
    uv pip install --system --no-cache-dir \
    fastapi \
    uvicorn \
    pydantic \
    python-multipart \
    jinja2 \
    aiofiles \
    sqlalchemy \
    alembic \
    psycopg2-binary \
    && uv pip install --system --no-cache-dir -r requirements.txt

# 复制前端构建结果
COPY --from=frontend-builder /app/build ./build
COPY --from=frontend-builder /app/package.json ./

# 复制后端代码
COPY ./backend ./backend

# 设置环境变量
ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NODE_ENV=production
ENV PORT=8080
ENV WEBUI_SECRET_KEY="lightweight-secure-key-2024"
ENV OPENAI_API_KEY=""
ENV OPENAI_BASE_URL=""
ENV DEFAULT_MODEL="deepseek-chat"

# 创建必要目录
RUN mkdir -p /app/backend/data

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 启动命令
CMD ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]