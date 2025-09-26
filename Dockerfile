# 最终简化版 - 直接使用官方基础镜像
FROM node:18-alpine

WORKDIR /app

# 复制绝对最小化的文件
COPY package.json ./
COPY package-lock.json ./

# 仅安装核心依赖（跳过开发依赖）
RUN npm install --production --legacy-peer-deps

# 复制源码（只复制必要文件）
COPY src/ ./src/
COPY static/ ./static/
COPY svelte.config.js ./
COPY vite.config.js ./
COPY tsconfig.json ./

# 直接构建（跳过所有修复脚本）
RUN npm run build

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["node", "build"]