#!/bin/bash
echo "开始构建轻量级 Open WebUI..."

# 清理之前的构建
docker rm -f openwebui-builder 2>/dev/null || true

# 使用 BuildKit 和缓存优化
DOCKER_BUILDKIT=1 docker build \
    --progress=plain \
    --memory=512m \
    --cpuset-cpus=0-1 \
    -t open-webui-lightweight .

echo "构建完成！"
echo "运行命令: docker run -p 8080:8080 open-webui-lightweight"