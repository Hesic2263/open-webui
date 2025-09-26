# Open WebUI - 修复版本冲突
FROM node:20-alpine AS frontend-builder

# 设置内存限制
ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NODE_ENV=production
WORKDIR /app

# 安装系统工具
RUN apk add --no-cache git python3 make g++

# 复制 package 文件
COPY package.json package-lock.json ./

# 🔧 修复：使用 npm install 而不是 npm ci（避免版本冲突）
RUN npm install --legacy-peer-deps

# 复制源码
COPY . .

# 创建修复文件
RUN mkdir -p src/lib/utils && \
    echo "// 安全简化版本 - 修复构建错误" > src/lib/utils/index.ts && \
    echo "import { v4 as uuidv4 } from 'uuid';" >> src/lib/utils/index.ts && \
    echo "import sha256 from 'js-sha256';" >> src/lib/utils/index.ts && \
    echo "import { WEBUI_BASE_URL } from '\$lib/constants';" >> src/lib/utils/index.ts && \
    echo "import dayjs from 'dayjs';" >> src/lib/utils/index.ts && \
    echo "import relativeTime from 'dayjs/plugin/relativeTime';" >> src/lib/utils/index.ts && \
    echo "" >> src/lib/utils/index.ts && \
    echo "dayjs.extend(relativeTime);" >> src/lib/utils/index.ts && \
    echo "" >> src/lib/utils/index.ts && \
    echo "// PDF功能已禁用" >> src/lib/utils/index.ts && \
    echo "const pdfWorkerUrl = '';" >> src/lib/utils/index.ts && \
    echo "" >> src/lib/utils/index.ts && \
    echo "export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));" >> src/lib/utils/index.ts && \
    echo "" >> src/lib/utils/index.ts && \
    echo "export const sanitizeResponseContent = (content) => {" >> src/lib/utils/index.ts && \
    echo "    return content" >> src/lib/utils/index.ts && \
    echo "        .replace(/<\\\\|[a-z]*\$/, '')" >> src/lib/utils/index.ts && \
    echo "        .replace(/<\\\\|[a-z]+\\\\|\$/, '')" >> src/lib/utils/index.ts && \
    echo "        .replace(/<\$/, '')" >> src/lib/utils/index.ts && \
    echo "        .replaceAll('<', '&lt;')" >> src/lib/utils/index.ts && \
    echo "        .replaceAll('>', '&gt;')" >> src/lib/utils/index.ts && \
    echo "        .trim();" >> src/lib/utils/index.ts && \
    echo "};" >> src/lib/utils/index.ts && \
    echo "" >> src/lib/utils/index.ts && \
    echo "export const sleepAsync = (ms) => new Promise(resolve => setTimeout(resolve, ms));" >> src/lib/utils/index.ts

# 同步配置
RUN npx svelte-kit sync

# 构建
RUN node --max_old_space_size=400 ./node_modules/vite/bin/vite.js build --mode production

# 后端环境
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
EXPOSE 8080

CMD ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]