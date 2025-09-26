#!/bin/bash
echo "修复依赖问题..."

# 检查并安装缺失的依赖
if ! npm list socket.io-client > /dev/null 2>&1; then
    echo "安装 socket.io-client..."
    npm install socket.io-client@^4.7.5 --save
fi

# 同步配置
npx svelte-kit sync

echo "依赖修复完成！"