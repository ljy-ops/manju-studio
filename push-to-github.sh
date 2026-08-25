#!/bin/bash

# Manju Studio - GitHub 一键推送脚本
# 使用方法: 解压 zip 后进入 manju-studio 目录，然后运行 ./push-to-github.sh

echo "🚀 Manju Studio - 一键推送到 GitHub"
echo "========================================"

# 检查是否在正确的目录
if [ ! -f "README.md" ]; then
    echo "❌ 错误: 请在 manju-studio 目录下运行此脚本"
    exit 1
fi

# 检查 git 是否安装
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 未安装 git，请先安装 git"
    exit 1
fi

# 步骤 1: 初始化 git 仓库
echo ""
echo "📦 步骤 1/5: 初始化 Git 仓库..."
if [ ! -d ".git" ]; then
    git init
    echo "   ✅ Git 仓库已初始化"
else
    echo "   ⚠️  Git 仓库已存在，跳过初始化"
fi

# 步骤 2: 配置用户信息
echo ""
echo "👤 步骤 2/5: 配置 Git 用户信息..."
git config user.name "ljy-ops"
git config user.email "ljy-ops@users.noreply.github.com"
echo "   ✅ 用户信息已配置"

# 步骤 3: 添加所有文件
echo ""
echo "📝 步骤 3/5: 添加文件到 Git..."
git add .
echo "   ✅ 文件已添加"

# 步骤 4: 提交
echo ""
echo "💾 步骤 4/5: 提交代码..."
git commit -m "Initial commit: Manju Studio - AI漫剧制作工作台" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ 代码已提交"
else
    echo "   ⚠️  提交已存在，继续推送..."
fi

# 步骤 5: 推送到 GitHub
echo ""
echo " 步骤 5/5: 推送到 GitHub..."
git branch -M main

# 从本地凭据文件读取 Token（安全方式，不硬编码）
TOKEN_FILE="$HOME/.config/github/token"
if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ 错误: 未找到 GitHub Token 文件: $TOKEN_FILE"
    echo "   请先创建该文件并写入你的 GitHub Personal Access Token"
    exit 1
fi
TOKEN=$(cat "$TOKEN_FILE")
git remote remove origin 2>/dev/null || true
git remote add origin "https://ljy-ops:${TOKEN}@github.com/ljy-ops/manju-studio.git"
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ 推送成功！"
    echo "🔗 访问你的仓库: https://github.com/ljy-ops/manju-studio"
    echo ""
    echo "⚠️  安全提醒: 请立即到 GitHub 删除刚才创建的 Token"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "❌ 推送失败，请检查:"
    echo "   1. 网络连接是否正常"
    echo "   2. Token 是否有效（可能已过期）"
    echo "   3. 仓库是否已创建"
    echo "========================================"
    exit 1
fi
