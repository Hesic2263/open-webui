FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 和安装依赖
COPY package.json package-lock.json* ./
RUN npm ci --only=production --force

# 复制源码并构建
COPY . .
RUN npm run build

# 生产镜像
FROM node:18-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package.json ./
RUN npm ci --only=production --force

# 复制构建结果
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S openwebui -u 1001

# 更改文件所有权
RUN chown -R openwebui:nodejs /app
USER openwebui

EXPOSE 8080

CMD ["node", "build"]