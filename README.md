# Manju Studio - AI漫剧制作工作台

> ComfyUI版本的小云雀，基于Toonflow后端 + TwitCanva画布引擎的混合架构

## 项目概述

Manju Studio 是一个面向AI漫剧制作的完整工作台，整合了剧本创作、资产管理、分镜设计、提示词生成、ComfyUI本地模型调用等全流程功能。

## 核心特性

### 1. 无限画布工作台
- 基于TwitCanva的画布引擎
- 支持节点拖拽、连线、分组
- 实时预览和状态追踪

### 2. 15阶段流程导航
- 可视化进度追踪
- 智能提示下一步操作
- 阶段状态自动检测

### 3. 剧本工作台
- 剧本骨架生成（支持5种模板：重生逆袭、甜宠、悬疑复仇、沙雕、自定义）
- 节奏编辑器（情绪曲线、节奏点标注）
- 角色弧光设计（4维弧光线、转折点锚定）
- 节拍编辑器（6要素表演块）
- 剧本诊断器（自动检测质量问题）

### 4. 资产管理系统
- 角色管理（多形象、活人感档案、表情变体）
- 场景管理（720度视角、GEO布局、光线逻辑）
- 道具管理

### 5. 分镜设计
- 分镜脚本生成
- 续接模式配置（独立/片段续接/首尾帧锁定）
- 构图参考图管理

### 6. 提示词生成
- Krea2生图提示词（6要素结构）
- MiniMax H3视频提示词
- Qwen Edit编辑指令
- 禁用词自动检查

### 7. ComfyUI本地模型集成
- Krea2文生图
- Qwen Edit 2511图片编辑
- SUPIR画质增强
- MiniMax H3视频生成

### 8. 导出与集成
- 完整项目JSON导出/导入
- 提示词包导出
- ComfyUI工作流导出
- 剪映时间线导出

## 技术架构

### 后端（Toonflow）
- **框架**: Express + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **通信**: WebSocket (Socket.io)
- **端口**: 10588

### 前端（TwitCanva）
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **画布引擎**: 自研Canvas引擎
- **端口**: 3001

### ComfyUI桥接层
- **服务**: ComfyUI Bridge Service
- **通信**: WebSocket (ws://localhost:8188/ws)
- **工作流**: JSON模板系统

## 项目结构

```
manju-studio/
├── backend/                    # Toonflow后端
│   ├── src/
│   │   ├── routes/manju/      # AI漫剧专用API
│   │   │   ├── script.ts      # 剧本管理
│   │   │   ├── character.ts   # 角色管理
│   │   │   ├── scene.ts       # 场景管理
│   │   │   ├── storyboard.ts  # 分镜管理
│   │   │   ├── prompt.ts      # 提示词生成
│   │   │   ├── process.ts     # 流程导航
│   │   │   ├── comfyui.ts     # ComfyUI桥接
│   │   │   ├── styleGuide.ts  # 画风管理
│   │   │   └── export.ts      # 导出服务
│   │   ├── services/
│   │   │   └── comfyui.ts     # ComfyUI Bridge Service
│   │   └── lib/
│   │       └── initDB.ts      # 数据库初始化
│   └── data/
│       └── comfyui-workflows/ # ComfyUI工作流模板
│
├── frontend/                   # TwitCanva前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/        # 画布节点组件
│   │   │   │   ├── ScriptNode.tsx
│   │   │   │   ├── CharacterNode.tsx
│   │   │   │   ├── SceneNode.tsx
│   │   │   │   ├── ShotNode.tsx
│   │   │   │   ├── PromptNode.tsx
│   │   │   │   ├── EditNode.tsx
│   │   │   │   └── ComfyUITaskNode.tsx
│   │   │   └── manju/         # AI漫剧专用组件
│   │   │       ├── ProcessNavigator.tsx
│   │   │       └── ExportPanel.tsx
│   │   └── types.ts           # 类型定义（扩展了AI漫剧节点）
│
└── docs/                       # 文档
    ├── ARCHITECTURE.md         # 架构设计
    └── COMFYUI_INTEGRATION.md  # ComfyUI集成方案
```

## 数据库表结构

### 新增表

#### o_process（流程状态表）
```sql
CREATE TABLE o_process (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId INTEGER NOT NULL,
  stageId VARCHAR NOT NULL,
  stageOrder INTEGER NOT NULL,
  status VARCHAR DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  nextAction TEXT,
  metadata TEXT,
  completedAt INTEGER,
  createTime INTEGER,
  updateTime INTEGER
);
```

## API接口

### 剧本管理
- `GET /api/manju/script/list` - 获取剧本列表
- `POST /api/manju/script/create` - 创建剧本
- `GET /api/manju/script/:scriptId` - 获取剧本详情
- `PUT /api/manju/script/:scriptId` - 更新剧本
- `DELETE /api/manju/script/:scriptId` - 删除剧本
- `POST /api/manju/script/:scriptId/generate` - 生成剧本骨架

### 角色管理
- `GET /api/manju/character/list` - 获取角色列表
- `POST /api/manju/character/create` - 创建角色
- `GET /api/manju/character/:assetId` - 获取角色详情
- `PUT /api/manju/character/:assetId` - 更新角色
- `DELETE /api/manju/character/:assetId` - 删除角色
- `POST /api/manju/character/:assetId/generateExpressions` - 生成表情变体
- `POST /api/manju/character/:assetId/arc` - 设置角色弧光

### 场景管理
- `GET /api/manju/scene/list` - 获取场景列表
- `POST /api/manju/scene/create` - 创建场景
- `GET /api/manju/scene/:assetId` - 获取场景详情
- `PUT /api/manju/scene/:assetId` - 更新场景
- `DELETE /api/manju/scene/:assetId` - 删除场景
- `POST /api/manju/scene/:assetId/views` - 添加场景视角

### 分镜管理
- `GET /api/manju/storyboard/list` - 获取分镜列表
- `POST /api/manju/storyboard/create` - 创建分镜
- `GET /api/manju/storyboard/:storyboardId` - 获取分镜详情
- `PUT /api/manju/storyboard/:storyboardId` - 更新分镜
- `DELETE /api/manju/storyboard/:storyboardId` - 删除分镜
- `POST /api/manju/storyboard/batchGenerate` - 批量生成分镜
- `POST /api/manju/storyboard/:storyboardId/continuity` - 设置续接模式

### 提示词生成
- `POST /api/manju/prompt/generate` - 生成提示词
- `POST /api/manju/prompt/batchGenerate` - 批量生成提示词
- `POST /api/manju/prompt/update` - 更新提示词
- `POST /api/manju/prompt/checkForbidden` - 检查禁用词

### 流程导航
- `GET /api/process/stages` - 获取阶段定义
- `GET /api/process/:projectId` - 获取项目流程状态
- `POST /api/process/:projectId/update` - 更新阶段状态
- `POST /api/process/:projectId/batch-update` - 批量更新阶段状态
- `GET /api/process/:projectId/next-action` - 获取下一步操作建议

### ComfyUI桥接
- `POST /api/comfyui/submit` - 提交ComfyUI任务
- `GET /api/comfyui/task/:taskId` - 查询任务状态
- `GET /api/comfyui/task/:taskId/result` - 获取任务结果
- `POST /api/comfyui/task/:taskId/cancel` - 取消任务
- `GET /api/comfyui/tasks` - 获取所有任务列表
- `GET /api/comfyui/workflows` - 获取工作流列表
- `GET /api/comfyui/workflow/:workflowId` - 获取工作流详情
- `GET /api/comfyui/status` - 检查ComfyUI连接状态

### 画风管理
- `GET /api/manju/styleGuide/presets` - 获取画风预设
- `GET /api/manju/styleGuide/:styleId` - 获取画风详情
- `POST /api/manju/styleGuide/apply` - 应用画风到项目
- `POST /api/manju/styleGuide/upload-reference` - 上传画风参考图

### 导出服务
- `GET /api/manju/export/project/:projectId/json` - 导出项目JSON
- `GET /api/manju/export/project/:projectId/prompts` - 导出提示词包
- `GET /api/manju/export/project/:projectId/comfyui-workflow` - 导出ComfyUI工作流
- `GET /api/manju/export/project/:projectId/jianying` - 导出剪映时间线
- `POST /api/manju/export/import` - 导入项目JSON

## 15阶段流程

1. **选题确认** - 确定故事概念和题材方向
2. **剧本骨架生成** - 生成集/幕/场景/节拍层次结构
3. **节奏编排** - 标注情绪曲线和关键节奏点
4. **角色弧光设计** - 定义角色成长轨迹
5. **节拍级表演定义** - 填充6要素表演块
6. **剧本诊断** - 自动检测剧本质量问题
7. **画风锁定** - 确定项目视觉风格
8. **角色资产** - 创建角色节点（含多形象+活人感）
9. **场景资产** - 创建场景节点（含720度视角）
10. **道具资产** - 创建关键道具节点
11. **分镜设计** - 生成分镜节点序列
12. **对白管理** - 标注对白情绪和音频提示词
13. **提示词生成** - 生成Krea2/H3/QwenEdit提示词
14. **智能分镜预览** - 批量预览并确认分镜图
15. **生图执行** - Krea2生图，素材回嵌画布
16. **图片编辑** - Qwen Edit编辑，素材回嵌
17. **画质增强** - SUPIR放大，素材回嵌
18. **生视频** - MiniMax H3生视频，素材回嵌
19. **导出** - 导出项目（JSON/提示词包/剪映格式）

## 支持的ComfyUI工作流

### Krea2文生图
- 模型: Krea2
- 功能: 文本到图像生成
- 参数: 提示词、宽高、采样步数、CFG、种子

### Qwen Edit 2511
- 模型: Qwen Edit 2511
- 功能: 图片编辑、局部重绘
- 参数: 源图片、编辑指令、重绘强度

### SUPIR画质增强
- 模型: SUPIR
- 功能: 4K-8K超分辨率
- 参数: 源图片、采样步数、CFG Scale

### MiniMax H3视频生成
- 模型: MiniMax H3
- 功能: 文本/图片到视频生成
- 参数: 首帧图片、提示词、宽高、帧数、帧率

## 开发状态

### 已完成
- ✅ 项目基础框架搭建
- ✅ Toonflow后端集成
- ✅ TwitCanva前端集成
- ✅ 数据库表结构扩展
- ✅ 后端API适配层（10个模块）
- ✅ 前端画布定制（9种节点组件）
- ✅ ComfyUI Bridge Service
- ✅ 15阶段流程导航
- ✅ 导出与集成功能
- ✅ AI Agent集成（剧本生成、角色提取、分镜生成、资产生成、提示词生成）
- ✅ 前端节点与后端API完整对接
- ✅ 所有TODO/FIXME项已解决

### 待优化（低优先级）
- 性能优化（大数据量渲染、WebSocket连接池、任务并发控制）
- 错误处理增强（统一错误处理机制、用户友好提示、日志系统）
- 用户权限（多用户支持、项目权限管理、协作功能）
- 扩展功能（更多ComfyUI工作流、更多画风预设、更多导出格式）
- 文档完善（API文档、用户手册、视频教程）

## 部署说明

### 环境要求
- Node.js 18+
- Python 3.10+
- ComfyUI (本地部署)
- 16GB+ 显存（推荐RTX 4090）

### 启动步骤

1. **启动ComfyUI**
```bash
cd ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

2. **启动后端**
```bash
cd manju-studio/backend
yarn install
yarn dev
```

3. **启动前端**
```bash
cd manju-studio/frontend
npm install
npm run dev
```

4. **访问应用**
- 前端: http://localhost:3001
- 后端API: http://localhost:10588
- ComfyUI: http://localhost:8188

## 参考项目

- [Toonflow](https://github.com/HBAI-Ltd/Toonflow-app) - 短剧制作后端
- [TwitCanva](https://github.com/SankaiAI/TwitCanva-Video-Workflow) - 画布引擎前端
- [OpenDirector](https://github.com/seme-org/open-director) - 9-Agent流水线设计

## 许可证

MIT

---

**文档版本**: v1.0  
**创建日期**: 2026-08-24  
**状态**: 开发中
