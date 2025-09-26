#!/bin/bash
echo "正在准备构建环境..."

# 检查必要文件是否存在
if [ ! -f "package.json" ]; then
    echo "错误: package.json 不存在"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
npm install

# 生成配置文件
echo "生成配置文件..."
npx svelte-kit sync

# 检查 TypeScript 配置
if [ ! -f "tsconfig.json" ]; then
    echo "创建 tsconfig.json..."
    cat > tsconfig.json << EOF
{
 "extends": "./.svelte-kit/tsconfig.json",
 "compilerOptions": {
  "allowJs": true,
  "checkJs": true,
  "esModuleInterop": true,
  "forceConsistentCasingInFileNames": true,
  "resolveJsonModule": true,
  "skipLibCheck": true,
  "sourceMap": true,
  "strict": true,
  "moduleResolution": "bundler"
 }
}
EOF
fi

echo "构建环境准备完成！"