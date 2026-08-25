# Manju Studio 操作指南

> **AI漫剧制作工作台 — ComfyUI版本的小云雀**
> 
> 版本：v1.0 | 更新日期：2026-08-25

---

## 目录

- [一、产品概述](#一产品概述)
- [二、环境部署](#二环境部署)
- [三、快速上手：从零制作一部AI漫剧](#三快速上手从零制作一部ai漫剧)
- [四、15阶段制作流程详解](#四15阶段制作流程详解)
- [五、无限画布工作台](#五无限画布工作台)
- [六、剧本模块](#六剧本模块)
- [七、角色模块](#七角色模块)
- [八、场景模块](#八场景模块)
- [九、分镜模块](#九分镜模块)
- [十、提示词模块](#十提示词模块)
- [十一、ComfyUI集成](#十一comfyui集成)
- [十二、编辑指令模块](#十二编辑指令模块)
- [十三、导出与导入](#十三导出与导入)
- [十四、API接口参考](#十四api接口参考)
- [十五、常见问题与排查](#十五常见问题与排查)

---

## 一、产品概述

### 1.1 什么是 Manju Studio

Manju Studio 是一个面向 **AI漫剧/AI短剧** 制作的全流程工作台，定位为「ComfyUI版本的小云雀」。它将 AI 漫剧制作从选题到导出的 15 个阶段整合到一个**无限画布工作台**中，通过 AI Agent 辅助完成剧本生成、分镜设计、提示词编写等核心环节。

### 1.2 核心能力

| 能力 | 说明 |
|------|------|
| **无限画布** | 所有制作元素（剧本、角色、场景、分镜、提示词、任务）以节点形式分布在画布上，自由拖拽、连线 |
| **AI Agent** | 剧本Agent（生成骨架、提取角色）+ 生产Agent（生成分镜、生成资产、生成提示词） |
| **ComfyUI桥接** | 本地连接 ComfyUI，支持 Krea2 生图、Qwen Edit 编辑、SUPIR 放大、MiniMax H3 生视频 |
| **15阶段流程** | 可视化进度条，实时显示当前阶段、下一步操作建议 |
| **导出集成** | 支持 JSON 全量导出、提示词包导出、ComfyUI工作流导出、剪映时间线导出 |

### 1.3 技术架构

```
┌─────────────────────────────────────────────────┐
│          前端层 (TwitCanva)                       │
│   React 18 + TypeScript + Vite                  │
│   无限画布引擎 / 节点系统 / 编辑器               │
│   端口: 3001                                     │
└────────────────────┬────────────────────────────┘
                     │ HTTP REST
┌────────────────────┴────────────────────────────┐
│          后端层 (Toonflow)                        │
│   Express + Socket.io + SQLite                  │
│   项目管理 / 剧本 / 角色 / 场景 / 分镜           │
│   AI Agent / ComfyUI桥接 / 导出服务              │
│   端口: 10588                                    │
└────────────────────┬────────────────────────────┘
                     │ WebSocket / HTTP
┌────────────────────┴────────────────────────────┐
│          模型层 (ComfyUI)                         │
│   Krea2 (文生图) / Qwen Edit (图片编辑)          │
│   SUPIR (画质增强) / MiniMax H3 (视频生成)       │
│   端口: 8188                                     │
└─────────────────────────────────────────────────┘
```

### 1.4 支持的AI模型

| 模型 | 类型 | 用途 | 运行方式 |
|------|------|------|---------|
| **Krea2** | 文生图 | 分镜图生成 | ComfyUI本地 (8步Turbo, FP8) |
| **Qwen Image Edit 2511** | 图片编辑 | 面部微调/背景替换/局部重绘 | ComfyUI本地 |
| **SUPIR** | 超分辨率 | 4K-8K画质增强 | ComfyUI本地 (需16GB+显存) |
| **MiniMax H3** | 视频生成 | 图生视频 (4-15秒片段) | 云端API / ComfyUI本地 |

---

## 二、环境部署

### 2.1 系统要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | Windows 10 / Ubuntu 20.04 | Windows 11 / Ubuntu 22.04 |
| GPU | NVIDIA 8GB VRAM | NVIDIA 16GB+ VRAM (RTX 4090) |
| 内存 | 16GB | 32GB+ |
| 硬盘 | 50GB 可用空间 | 200GB+ SSD |
| Node.js | v18+ | v20 LTS |
| Python | 3.10+ | 3.11 |

### 2.2 安装步骤

#### 第一步：安装 ComfyUI

```bash
# 克隆 ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 安装依赖
pip install -r requirements.txt

# 下载模型（放入 models/checkpoints/ 目录）
# - Krea2 模型
# - Qwen Image Edit 2511 模型
# - SUPIR 模型
```

#### 第二步：启动 ComfyUI

```bash
cd ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

启动后访问 `http://localhost:8188` 确认 ComfyUI 正常运行。

#### 第三步：安装 Manju Studio 后端

```bash
cd manju-studio/backend

# 安装依赖
npm install

# 启动后端服务
npm run dev
# 默认端口: 10588
```

#### 第四步：安装 Manju Studio 前端

```bash
cd manju-studio/frontend

# 安装依赖
npm install

# 启动前端开发服务器
npm run dev
# 默认端口: 3001
```

#### 第五步：验证部署

1. 打开浏览器访问 `http://localhost:3001`
2. 确认画布界面正常加载
3. 检查顶部流程导航栏是否显示 15 个阶段
4. 在画布空白处右键，确认节点菜单弹出

### 2.3 端口一览

| 服务 | 端口 | 用途 |
|------|------|------|
| Manju Studio 前端 | 3001 | 用户界面 |
| Manju Studio 后端 | 10588 | 业务API |
| ComfyUI | 8188 | 本地模型推理 |

### 2.4 配置 ComfyUI 工作流模板

工作流模板存放在 `backend/data/comfyui-workflows/` 目录下：

| 文件 | 用途 |
|------|------|
| `krea2_t2i.json` | Krea2 文生图工作流 |
| `qwen_edit.json` | Qwen Image Edit 图片编辑工作流 |
| `supir_upscale.json` | SUPIR 超分辨率放大工作流 |
| `minimax_h3_t2v.json` | MiniMax H3 文/图生视频工作流 |

确保这些文件已正确放置在 ComfyUI 可识别的路径下，或通过 Manju Studio 后端自动加载。

---

## 三、快速上手：从零制作一部AI漫剧

以下用一个完整示例演示全流程：**制作一部3分钟的「重生逆袭」短剧**。

### 步骤总览

```
选题 → 剧本骨架 → 节奏编排 → 角色设计 → 画风锁定
  → 资产创建 → 分镜设计 → 提示词生成 → 生图 → 编辑
  → 放大 → 生视频 → 导出
```

### Step 1：创建项目 & 选题（阶段1）

1. 启动 Manju Studio，点击「新建项目」
2. 填写项目信息：
   - 名称：`重生逆袭之都市传奇`
   - 类型：`短剧`
   - 画风：`写实`
   - 画面比例：`16:9`
3. 进入无限画布，顶部流程导航栏显示当前处于「阶段1：选题确认」

### Step 2：生成剧本骨架（阶段2a）

1. 在画布上右键 → 选择「剧本节点」
2. 点击节点上的「生成剧本」按钮
3. AI Agent 自动生成：
   - 1集 × 3分钟的集/幕/场景/节拍结构
   - 包含冷启动钩子、转折点、高潮等节奏要素
4. 点击「编辑」可手动调整骨架内容

### Step 3：创建角色资产（阶段4）

1. 在剧本节点上点击「提取角色」→ AI自动从剧本中提取角色
2. 或右键画布 → 「角色节点」手动创建
3. 每个角色节点包含：
   - 角色标签（唯一标识）
   - 外貌描述（注入提示词的核心信息）
   - 多形象管理（不同服装/造型）
   - 活人感档案（眨眼模式、手部习惯等）
4. 点击「生成表情」→ 生成6种表情变体

### Step 4：创建场景资产（阶段5）

1. 右键画布 → 「场景节点」
2. 填写场景信息：
   - GEO布局（纯空间描述，不含角色和动作）
   - 光线逻辑（一景一光原则）
3. 点击「预览视角」→ 查看已添加的场景视角

### Step 5：生成分镜（阶段7）

1. 右键画布 → 「分镜节点」
2. 点击「生成分镜」→ 生产Agent自动从剧本生成分镜序列
3. 每个分镜包含：景别、镜头运动、角色位置、情绪强度、续接模式

### Step 6：生成提示词（阶段9）

1. 右键画布 → 「提示词节点」
2. 点击「生成提示词」→ 自动为当前分镜生成三套提示词：
   - **Krea2 提示词**：用于文生图
   - **MiniMax H3 提示词**：用于视频生成
   - **Qwen Edit 指令**：用于图片编辑
3. 点击「批量生成」→ 为所有分镜批量生成
4. 系统自动检查禁用词

### Step 7：执行生图（阶段11）

1. 右键画布 → 「ComfyUI任务节点」
2. 选择工作流：`Krea2 文生图`
3. 点击「提交任务」→ 任务发送到本地 ComfyUI
4. 节点实时显示进度条，完成后结果图自动回嵌到画布

### Step 8：图片编辑（阶段12）

1. 右键画布 → 「编辑指令节点」
2. 配置编辑流水线（最多4步）：
   - Step 1：面部微调（Qwen Edit）
   - Step 2：背景替换（Qwen Edit）
   - Step 3：局部重绘（Qwen Edit）
   - Step 4：画质增强（SUPIR）
3. 每步可独立开关
4. 点击「执行编辑」→ 按顺序自动执行

### Step 9：生成视频（阶段14）

1. 在 ComfyUI 任务节点选择工作流：`MiniMax H3 视频生成`
2. 设置参数：时长（4-15秒）、模式（T2V/FLF2V/R2V）
3. 提交任务 → 等待视频生成完成

### Step 10：导出（阶段15）

1. 点击顶部工具栏「导出」按钮
2. 选择导出格式：
   - **完整项目 JSON**：备份全部数据
   - **提示词包**：仅导出所有提示词
   - **ComfyUI 工作流**：可直接导入 ComfyUI 使用
   - **剪映时间线**：导入剪映进行后期剪辑

---

## 四、15阶段制作流程详解

流程导航组件位于界面顶部，以横向进度条形式展示。每个阶段有三种状态：

| 状态 | 图标 | 颜色 | 含义 |
|------|------|------|------|
| 待处理 | ○ 空心圆 | 灰色 | 尚未开始 |
| 进行中 | ◉ 旋转加载 | 蓝色 | 当前正在处理 |
| 已完成 | ✓ 勾选圆 | 绿色 | 已完成 |

### 阶段列表

| 阶段 | 名称 | 分组 | 说明 | 操作建议 |
|------|------|------|------|---------|
| 1 | 选题确认 | 前期 | 确定故事概念和题材方向 | 参考热门题材：重生逆袭、甜宠、悬疑复仇 |
| 2a | 剧本骨架生成 | 剧本 | 生成集/幕/场景/节拍层次结构 | 选择模板类型，建议先做1集3分钟试水 |
| 2b | 节奏编排 | 剧本 | 标注情绪曲线和关键节奏点 | 确保冷启动钩子情绪强度≥7 |
| 2c | 角色弧光设计 | 剧本 | 定义角色成长轨迹 | 每个主要角色至少1个转折点 |
| 2d | 节拍级表演定义 | 剧本 | 填充6要素表演块 | 每个节拍必须有冲突定义 |
| 2e | 剧本诊断 | 剧本 | 自动检测剧本质量问题 | 确保无🔴级问题 |
| 3 | 画风锁定 | 风格 | 确定项目视觉风格 | 风格锚定词会自动注入所有提示词 |
| 4 | 角色资产 | 资产 | 创建角色节点（含多形象+活人感） | 角色表必须包含无头全身正面 |
| 5 | 场景资产 | 资产 | 创建场景节点（含720度视角） | GEO布局必须是纯空间地图 |
| 6 | 道具资产 | 资产 | 创建关键道具节点 | 只创建对剧情有推动作用的道具 |
| 7 | 分镜设计 | 分镜 | 生成分镜节点序列 | 第一秒必须是全景无对白 |
| 8 | 对白管理 | 分镜 | 标注对白情绪和音频提示词 | 无对白镜头自动注入沉默条款 |
| 9 | 提示词生成 | 提示词 | 生成Krea2/H3/QwenEdit提示词 | H3时长4-15秒，参考图≤9 |
| 10 | 智能分镜预览 | 预览 | 批量预览并确认分镜图 | 先确认构图再花算力 |
| 11 | 生图执行 | 生成 | Krea2生图，素材回嵌画布 | 可生成多个版本择优 |
| 12 | 图片编辑 | 生成 | Qwen Edit编辑，素材回嵌 | 面部微调→背景替换→局部重绘 |
| 13 | 画质增强 | 生成 | SUPIR放大，素材回嵌 | 需16GB+显存 |
| 14 | 生视频 | 生成 | MiniMax H3生视频，素材回嵌 | 支持T2V/FLF2V/R2V三种模式 |
| 15 | 导出 | 导出 | 导出项目 | 支持JSON/提示词包/剪映格式 |

### 流程导航操作

**查看当前阶段**：顶部进度条自动高亮当前阶段，鼠标悬停可查看阶段描述和操作建议。

**手动更新阶段状态**：点击阶段节点可手动切换状态（待处理/进行中/已完成）。

**获取下一步建议**：点击阶段节点后，弹出提示框显示当前阶段的具体操作建议。

---

## 五、无限画布工作台

### 5.1 画布基础操作

| 操作 | 方式 |
|------|------|
| 平移画布 | 鼠标中键拖拽 / 空格+左键拖拽 |
| 缩放画布 | 鼠标滚轮 |
| 新建节点 | 右键空白处 → 选择节点类型 |
| **拖拽上传** | **从桌面拖拽图片/视频到画布空白处释放** |
| 选中节点 | 左键单击节点 |
| 多选节点 | Shift+左键 / 框选 |
| 移动节点 | 左键拖拽节点 |
| 删除节点 | 选中后按 Delete 键 / 点击节点上的删除按钮 |
| 节点连线 | 从输出端口拖拽到输入端口 |

### 5.2 拖拽上传（Drag & Drop）

Manju Studio 支持从桌面直接拖拽图片和视频文件到画布中，自动创建对应节点：

**支持的格式**：
- **图片**：PNG、JPG、JPEG、WebP、GIF、BMP
- **视频**：MP4、WebM、MOV、AVI

**操作步骤**：
1. 从文件管理器中选择图片或视频文件
2. 拖拽到画布空白区域
3. 释放鼠标，系统自动创建 Image 或 Video 节点
4. 节点会显示上传的文件内容，并自动检测分辨率和比例

**拖拽反馈**：
- 拖拽过程中画布会显示蓝色高亮覆盖层和提示文字
- 释放后立即创建节点并自动选中

**多文件拖拽**：
- 支持同时拖拽多个文件
- 多个节点会自动水平排列，间距 400px

**使用场景**：
- 导入参考图作为角色/场景设计参考
- 导入已有视频片段进行二次编辑
- 导入素材到 ComfyUI 任务节点进行处理

### 5.3 九种节点类型

| 节点 | 图标 | 用途 | AI集成 |
|------|------|------|--------|
| **剧本节点** | 📄 FileText | 展示和编辑剧本骨架 | ✅ 剧本Agent |
| **角色节点** | 👤 User | 角色信息、多形象、表情 | ✅ 剧本Agent |
| **场景节点** | 📍 MapPin | 场景GEO布局、视角管理 | - |
| **分镜节点** | 📷 Camera | 景别、镜头运动、角色位置 | ✅ 生产Agent |
| **提示词节点** | 💬 MessageSquare | Krea2/H3/Qwen提示词 | ✅ 生产Agent |
| **编辑指令节点** | ✨ Wand2 | 4步编辑流水线 | - |
| **ComfyUI任务节点** | 🔲 Cpu | 任务提交、进度、结果 | ✅ 生产Agent |
| **流程导航** | - | 15阶段进度条（顶部固定） | - |
| **导出面板** | - | 多格式导出弹窗 | - |

### 5.3 节点通用结构

每个节点由以下部分组成：

```
┌──────────────────────────┐
│ [图标] 节点标题     [×]  │ ← 节点头部
├──────────────────────────┤
│                          │
│   信息展示区              │ ← 显示当前数据
│   (只读/可编辑)          │
│                          │
├──────────────────────────┤
│ [按钮1] [按钮2] [...]   │ ← 操作按钮区
└──────────────────────────┘
```

---

## 六、剧本模块

### 6.1 概述

剧本是一切的根基。Manju Studio 的剧本模块支持从概念到完整骨架的 AI 辅助生成，并提供可视化编辑器进行手动调整。

### 6.2 创建剧本

**方式一：通过画布节点**
1. 右键画布空白处 → 选择「剧本节点」
2. 节点创建后，点击「生成剧本」按钮

**方式二：通过API**
```
POST /api/manju/script/create
{
  "projectId": 1,
  "title": "我的第一个剧本",
  "templateId": "rebirth"    // 可选: rebirth / sweet / suspense / comedy / custom
}
```

### 6.3 AI生成剧本骨架

点击剧本节点上的「生成剧本」按钮，AI Agent 将自动生成：

- **集 (Episode)**：顶层结构，每集有独立的故事线
- **幕 (Act)**：每集分为多个幕，对应场景切换
- **场景 (Scene)**：每幕包含多个场景
- **节拍 (Beat)**：最小叙事单元，每个节拍对应一个分镜

**生成参数**：
| 参数 | 说明 | 默认值 |
|------|------|--------|
| templateId | 剧本模板 | custom |
| episodeCount | 集数 | 1 |
| duration | 每集时长 | 3min |

**可用模板**：
| 模板ID | 类型 | 特点 |
|--------|------|------|
| `rebirth` | 重生逆袭 | 冷启动钩子+逆袭节奏 |
| `sweet` | 甜宠 | 高甜密度+误会冲突 |
| `suspense` | 悬疑复仇 | 线索铺设+反转 |
| `comedy` | 沙雕 | 快节奏+反差萌 |
| `custom` | 自定义 | 自由结构 |

### 6.4 提取角色

剧本生成后，点击「提取角色」按钮，AI Agent 会自动：
1. 扫描全部剧本内容
2. 识别出现的人物
3. 提取外貌描述、性格标签
4. 自动创建对应的角色节点

### 6.5 剧本编辑器

点击「编辑」按钮打开剧本编辑器弹窗，可手动调整：
- 集数和每集时长
- 总节拍数
- 模板类型
- 各幕/场景/节拍的具体内容

### 6.6 剧本数据结构

```json
{
  "episodes": [
    {
      "duration": "3min",
      "acts": [
        {
          "scenes": [
            {
              "beats": [
                {
                  "id": "beat_1",
                  "description": "...",
                  "emotionIntensity": 7,
                  "characters": ["主角"]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "templateId": "rebirth",
  "totalBeats": 12
}
```

---

## 七、角色模块

### 7.1 概述

角色模块管理所有角色的资产信息，支持多形象、表情变体、活人感档案和角色弧光。

### 7.2 创建角色

**手动创建**：
1. 右键画布 → 「角色节点」
2. 在弹出的编辑器中填写：
   - **名称**：角色名
   - **标签**：唯一标识（用于提示词引用）
   - **外貌描述**：详细的外貌文字描述

**AI提取**：
1. 在已生成剧本的剧本节点上点击「提取角色」
2. AI自动识别并创建角色

### 7.3 角色多形象

一个角色可以拥有多个形象（如：校服、职场装、晚礼服等），每个形象独立管理。

```json
{
  "forms": [
    { "name": "校服形象", "description": "...", "referenceImage": "..." },
    { "name": "职场形象", "description": "...", "referenceImage": "..." }
  ]
}
```

### 7.4 表情变体生成

点击角色节点上的「生成表情」按钮，系统会基于角色外貌描述生成6种标准表情变体：

| 表情 | 用途 |
|------|------|
| 平静 | 日常对话 |
| 喜悦 | 开心场景 |
| 愤怒 | 冲突场景 |
| 悲伤 | 低谷场景 |
| 惊讶 | 反转场景 |
| 恐惧 | 紧张场景 |

### 7.5 角色弧光

角色弧光描述角色在故事中的成长轨迹：

| 属性 | 说明 |
|------|------|
| arcType | 弧光类型：逆袭 / 堕落 / 觉醒 / 扁平 |
| startState | 起始状态描述 |
| endState | 终局状态描述 |
| turningPoints | 转折点数组（对应剧本中的关键节拍） |

**设置弧光**：
```
POST /api/manju/character/:assetId/arc
{
  "arcType": "逆袭",
  "startState": { "status": "被欺负的普通学生", "emotion": "隐忍" },
  "endState": { "status": "逆袭成功的商业精英", "emotion": "自信" },
  "turningPoints": ["beat_3", "beat_7", "beat_11"]
}
```

### 7.6 活人感档案

活人感是角色区别于AI生成角色的关键，包含：

| 维度 | 说明 | 示例 |
|------|------|------|
| 眨眼模式 | 不同情绪下的眨眼频率 | 紧张时频繁眨眼 |
| 手部习惯 | 角色的标志性手部动作 | 思考时托腮 |
| 情绪肌肉映射 | 情绪对应的面部肌肉变化 | 愤怒时咬肌紧绷 |

---

## 八、场景模块

### 8.1 概述

场景模块管理所有场景资产，核心概念是 **GEO布局**（纯空间地图）和 **720度视角**。

### 8.2 创建场景

1. 右键画布 → 「场景节点」
2. 填写场景信息：
   - **名称**：如「高中教室」
   - **标签**：唯一标识
   - **GEO布局**：纯空间描述
   - **光线逻辑**：光源方向和色温

### 8.3 GEO布局规范

GEO布局是**纯空间地图**，不包含角色和动作描述：

```
✅ 正确示例：
教室空间 8m×10m，南向窗户三组，自然光从右侧进入。
讲台位于北墙中央，黑板覆盖北墙2/3面积。
课桌四列六排，中间留有1.2m过道。

❌ 错误示例：
小明坐在教室里看书（包含角色和动作）
```

### 8.4 720度视角管理

每个场景可以添加多个视角，用于不同分镜的构图参考：

1. 在场景编辑器中点击「添加视角」
2. 填写视角信息：
   - 视角名称（如：正面全景、侧面特写、俯拍）
   - 参考图（可选）
   - 该视角下的GEO布局调整

### 8.5 光线逻辑

遵循「一景一光」原则：

```json
{
  "lighting": "主光源：南向窗户自然光，色温5500K，从画面右侧45°射入。辅光：天花板日光灯，色温4000K，均匀补光。阴影方向：向左下方投射。"
}
```

---

## 九、分镜模块

### 9.1 概述

分镜是连接剧本和视觉产出的桥梁。每个分镜节点对应一个具体的镜头。

### 9.2 生成分镜

**AI自动生成分镜**：
1. 在分镜节点上点击「生成分镜」
2. 生产Agent从剧本+角色+场景自动生成分镜序列

**分镜参数**：

| 参数 | 说明 | 可选值 |
|------|------|--------|
| shotSize | 景别 | 全景 / 中景 / 近景 / 特写 / 大特写 |
| cameraMovement | 镜头运动 | 固定 / 推 / 拉 / 摇 / 移 / 跟 / 升 / 降 |
| emotionIntensity | 情绪强度 | 1-10 |
| continuityMode | 续接模式 | 硬切 / 叠化 / 闪白 / 闪黑 |
| characters | 出场角色 | 角色标签数组 |
| action | 动作描述 | 文本 |
| duration | 时长 | 如 "5s" |

### 9.3 续接模式

分镜之间的过渡逻辑：

| 模式 | 效果 | 适用场景 |
|------|------|---------|
| 硬切 | 直接切换 | 快节奏、动作场景 |
| 叠化 | 渐变过渡 | 时间流逝 |
| 闪白 | 白色闪帧 | 回忆、闪回 |
| 闪黑 | 黑色闪帧 | 场景切换 |

### 9.4 批量分镜生成

通过API批量生成：
```
POST /api/manju/storyboard/batchGenerate
{
  "projectId": 1,
  "scriptId": 1
}
```

---

## 十、提示词模块

### 10.1 概述

提示词模块为每个分镜自动生成三套针对不同模型的提示词。

### 10.2 三套提示词

| 提示词类型 | 目标模型 | 用途 |
|-----------|---------|------|
| **Krea2 Prompt** | Krea2 (ComfyUI) | 文生图，生成分镜图 |
| **MiniMax H3 Prompt** | MiniMax H3 | 视频生成，包含运镜指令 |
| **Qwen Edit Instruction** | Qwen Image Edit 2511 | 图片编辑指令 |

### 10.3 生成提示词

**单个生成**：
1. 在提示词节点上点击「生成提示词」
2. 系统读取关联分镜的数据，自动生成三套提示词

**批量生成**：
1. 点击「批量生成」按钮
2. 生产Agent为所有分镜批量生成提示词

### 10.4 提示词结构

**Krea2 提示词结构**：
```
[风格锚定词], [场景描述], [角色描述], [动作描述],
[光线描述], [构图描述], [画质修饰词]
```

**MiniMax H3 提示词结构**：
```
[场景描述], [角色动作], [镜头运动: 推/拉/摇/...],
[时长: Xs], [情绪氛围], [Audio: 环境音描述]
```

**Qwen Edit 指令**：
```
自然语言描述编辑意图，如：
"将人物的表情从平静改为微笑，保持其他部分不变"
```

### 10.5 禁用词检查

系统内置禁用词检查功能，在生成提示词时自动校验：

```
POST /api/manju/prompt/checkForbidden
{
  "text": "要检查的提示词文本"
}

// 返回
{
  "hasForbidden": true,
  "detectedWords": ["暴力", "血腥"]
}
```

### 10.6 复制提示词

每个提示词区域右上角有复制按钮，点击即可复制到剪贴板，方便手动粘贴到 ComfyUI。

---

## 十一、ComfyUI集成

### 11.1 概述

Manju Studio 通过 ComfyUI 桥接层与本地 ComfyUI 实例通信，实现任务的提交、监控和结果回嵌。

### 11.2 连接检查

在开始生图/生视频前，先确认 ComfyUI 连接状态：

```
GET /api/comfyui/status

// 返回
{
  "connected": true,
  "systemStats": {
    "gpu_name": "NVIDIA GeForce RTX 4090",
    "vram_total": 24576,
    "vram_free": 18432
  }
}
```

### 11.3 上传素材

ComfyUI 任务节点支持上传本地图片或视频作为输入素材：

**操作步骤**：
1. 在 ComfyUI 任务节点上点击「上传素材」按钮
2. 选择图片（PNG/JPG/WebP）或视频（MP4/MOV/WebM）文件
3. 文件会显示在节点的「输入素材」区域
4. 上传后自动填充到工作流参数中

**支持的格式**：
- **图片**：PNG、JPG、JPEG、WebP、GIF、BMP
- **视频**：MP4、MOV、WebM、AVI

**使用场景**：
- **图生视频**：上传图片作为首帧，使用 MiniMax H3 生成视频
- **图片编辑**：上传图片使用 Qwen Edit 进行编辑
- **画质增强**：上传低分辨率图片使用 SUPIR 放大
- **风格转换**：上传图片使用 Krea2 进行风格化处理

**拖拽上传**：
除了点击按钮上传，还可以直接从桌面拖拽文件到画布空白处，自动创建对应的 Image 或 Video 节点。详见 [5.2 拖拽上传](#52-拖拽上传drag-drop)。

### 11.4 提交任务

通过 ComfyUI 任务节点：
1. 选择工作流（Krea2文生图 / Qwen Edit / SUPIR放大 / MiniMax H3视频）
2. 上传素材（可选，图生图/图生视频场景需要）
3. 配置参数（提示词、分辨率、时长等）
4. 点击「提交任务」

通过API：
```
POST /api/comfyui/submit
{
  "workflowId": "krea2_t2i",
  "parameters": {
    "prompt": "anime style, a girl standing in classroom, ...",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 576,
    "steps": 8,
    "cfg_scale": 1.0
  }
}

// 返回
{
  "taskId": "task_abc123",
  "message": "任务已提交"
}
```

### 11.5 任务状态查询

```
GET /api/comfyui/task/:taskId

// 返回
{
  "id": "task_abc123",
  "workflowId": "krea2_t2i",
  "status": "running",    // idle / running / completed / failed
  "progress": 0.65,       // 0-1
  "error": null
}
```

ComfyUI任务节点会每2秒自动轮询任务状态，并在节点上实时更新进度条。

### 11.5 获取任务结果

```
GET /api/comfyui/task/:taskId/result

// 返回
{
  "taskId": "task_abc123",
  "workflowId": "krea2_t2i",
  "result": {
    "image": "http://localhost:8188/view?filename=xxx.png"
  }
}
```

任务完成后，结果图片/视频会自动回嵌到画布上的对应节点。

### 11.6 取消任务

```
POST /api/comfyui/task/:taskId/cancel
```

### 11.7 查看工作流列表

```
GET /api/comfyui/workflows

// 返回4个预定义工作流
{
  "workflows": [
    {
      "id": "krea2_t2i",
      "name": "Krea2 文生图",
      "description": "使用Krea2模型进行文本生成图片",
      "category": "image_generation",
      "parameters": [...],
      "outputs": [{ "type": "image", "label": "生成图片" }]
    },
    ...
  ]
}
```

### 11.8 四种工作流详解

#### Krea2 文生图

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| prompt | string | 正向提示词 | 必填 |
| negative_prompt | string | 反向提示词 | 空 |
| width | number | 图片宽度 | 1024 |
| height | number | 图片高度 | 576 |
| steps | number | 采样步数 | 8 |
| cfg_scale | number | CFG引导强度 | 1.0 |

#### Qwen Image Edit

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| image | string | 输入图片URL | 必填 |
| instruction | string | 编辑指令（自然语言） | 必填 |
| mask_description | string | 遮罩区域描述 | 可选 |

#### SUPIR 画质增强

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| image | string | 输入图片URL | 必填 |
| scale | number | 放大倍数 | 4 |
| target_dpi | string | 目标DPI | 4K |

#### MiniMax H3 视频生成

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| mode | string | 生成模式 | FLF2V |
| image | string | 首帧图片URL | FLF2V/R2V必填 |
| prompt | string | 视频描述提示词 | 必填 |
| duration | number | 视频时长(秒) | 5 |

**三种模式**：
| 模式 | 说明 | 输入 |
|------|------|------|
| T2V | 文生视频 | 仅提示词 |
| FLF2V | 首帧生视频 | 首帧图片 + 提示词 |
| R2V | 参考生视频 | 参考图 + 提示词 |

---

## 十二、编辑指令模块

### 12.1 概述

编辑指令节点实现了一个 **4步编辑流水线**，对生成的图片进行精细化处理。

### 12.2 四步流水线

| 步骤 | 类型 | 模型 | 说明 |
|------|------|------|------|
| Step 1 | face_adjust | Qwen Edit | 面部微调：调整表情、五官细节 |
| Step 2 | background_replace | Qwen Edit | 背景替换：更换场景背景 |
| Step 3 | local_inpaint | Qwen Edit | 局部重绘：修复特定区域 |
| Step 4 | upscale | SUPIR | 画质增强：放大到4K-8K |

### 12.3 配置编辑步骤

每个步骤可以独立开关，并配置具体参数：

```json
{
  "steps": [
    {
      "stepType": "face_adjust",
      "enabled": true,
      "instruction": "将人物表情从平静改为微笑",
      "outputImage": null
    },
    {
      "stepType": "background_replace",
      "enabled": true,
      "instruction": "将背景替换为黄昏时分的城市天台",
      "outputImage": null
    },
    {
      "stepType": "local_inpaint",
      "enabled": false,
      "instruction": "",
      "outputImage": null
    },
    {
      "stepType": "upscale",
      "enabled": true,
      "instruction": "",
      "outputImage": null
    }
  ]
}
```

### 12.4 执行编辑

点击「执行编辑」按钮，系统按顺序执行每个启用的步骤：
1. 当前步骤高亮显示
2. 提交 ComfyUI 任务
3. 等待完成后，输出图片作为下一步的输入
4. 所有步骤完成后，最终结果回嵌画布

---

## 十三、导出与导入

### 13.1 导出面板

点击顶部工具栏的「导出」按钮打开导出面板。

### 13.2 四种导出格式

#### 完整项目 JSON

包含项目的所有数据：剧本、角色、场景、分镜、流程状态。

**用途**：项目备份、跨设备迁移

**数据结构**：
```json
{
  "version": "1.0",
  "exportTime": "2026-08-25T10:00:00Z",
  "project": { "id": 1, "name": "...", "artStyle": "..." },
  "scripts": [...],
  "characters": [...],
  "scenes": [...],
  "props": [...],
  "storyboards": [...],
  "processStages": [...]
}
```

#### 提示词包

仅包含所有分镜的三套提示词。

**用途**：批量处理、外部工具使用

```json
[
  {
    "shotId": 1,
    "index": 0,
    "krea2Prompt": "...",
    "minimaxH3Prompt": "...",
    "qwenEditPrompt": "..."
  }
]
```

#### ComfyUI 工作流

生成可直接导入 ComfyUI 的工作流 JSON 文件。

**用途**：在 ComfyUI 中直接加载运行

包含的节点链：
```
Krea2文生图 → Qwen Edit编辑 → MiniMax H3视频
```

#### 剪映时间线

生成剪映兼容的时间线数据。

**用途**：导入剪映进行后期剪辑、添加音乐和字幕

```json
{
  "version": "1.0",
  "tracks": [
    {
      "type": "video",
      "clips": [
        { "id": "clip_0", "source": "video_1.mp4", "startTime": 0, "duration": 5 }
      ]
    },
    {
      "type": "audio",
      "clips": [
        { "id": "audio_0", "source": "dialogue_1.wav", "text": "台词内容" }
      ]
    }
  ]
}
```

### 13.3 导入项目

1. 在导出面板中点击「从 JSON 文件导入」
2. 选择之前导出的项目 JSON 文件
3. 系统自动恢复所有数据

---

## 十四、API接口参考

### 14.1 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:10588/api` |
| 请求格式 | JSON |
| 响应格式 | `{ success: boolean, data?: any, message?: string }` |

### 14.2 剧本管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/manju/script/list?projectId={id}` | 获取剧本列表 |
| POST | `/manju/script/create` | 创建剧本 |
| GET | `/manju/script/{scriptId}` | 获取剧本详情 |
| PUT | `/manju/script/{scriptId}` | 更新剧本 |
| DELETE | `/manju/script/{scriptId}` | 删除剧本 |
| POST | `/manju/script/{scriptId}/generate` | AI生成剧本骨架 |

### 14.3 角色管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/manju/character/list?projectId={id}` | 获取角色列表 |
| POST | `/manju/character/create` | 创建角色 |
| GET | `/manju/character/{assetId}` | 获取角色详情 |
| PUT | `/manju/character/{assetId}` | 更新角色 |
| DELETE | `/manju/character/{assetId}` | 删除角色 |
| POST | `/manju/character/{assetId}/generateExpressions` | 生成表情变体 |
| POST | `/manju/character/{assetId}/arc` | 设置角色弧光 |

### 14.4 场景管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/manju/scene/list?projectId={id}` | 获取场景列表 |
| POST | `/manju/scene/create` | 创建场景 |
| GET | `/manju/scene/{assetId}` | 获取场景详情 |
| PUT | `/manju/scene/{assetId}` | 更新场景 |
| DELETE | `/manju/scene/{assetId}` | 删除场景 |
| POST | `/manju/scene/{assetId}/views` | 添加场景视角 |

### 14.5 分镜管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/manju/storyboard/list?projectId={id}` | 获取分镜列表 |
| POST | `/manju/storyboard/create` | 创建分镜 |
| GET | `/manju/storyboard/{id}` | 获取分镜详情 |
| PUT | `/manju/storyboard/{id}` | 更新分镜 |
| DELETE | `/manju/storyboard/{id}` | 删除分镜 |
| POST | `/manju/storyboard/batchGenerate` | 批量生成分镜 |
| POST | `/manju/storyboard/{id}/continuity` | 设置续接模式 |

### 14.6 提示词生成

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/manju/prompt/generate` | 生成单个分镜提示词 |
| POST | `/manju/prompt/batchGenerate` | 批量生成提示词 |
| POST | `/manju/prompt/update` | 更新提示词 |
| POST | `/manju/prompt/checkForbidden` | 检查禁用词 |

### 14.7 ComfyUI 桥接

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/comfyui/submit` | 提交任务 |
| GET | `/comfyui/task/{taskId}` | 查询任务状态 |
| GET | `/comfyui/task/{taskId}/result` | 获取任务结果 |
| POST | `/comfyui/task/{taskId}/cancel` | 取消任务 |
| GET | `/comfyui/tasks` | 获取所有任务 |
| GET | `/comfyui/workflows` | 获取工作流列表 |
| GET | `/comfyui/workflow/{id}` | 获取工作流详情 |
| GET | `/comfyui/status` | 检查连接状态 |

### 14.8 流程导航

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/process/stages` | 获取阶段定义 |
| GET | `/process/{projectId}` | 获取项目流程状态 |
| POST | `/process/{projectId}/update` | 更新阶段状态 |
| POST | `/process/{projectId}/batch-update` | 批量更新阶段 |
| GET | `/process/{projectId}/next-action` | 获取下一步建议 |

### 14.9 画风管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/manju/styleGuide/presets` | 获取画风预设列表 |
| GET | `/manju/styleGuide/{styleId}` | 获取画风详情 |
| POST | `/manju/styleGuide/apply` | 应用画风到项目 |
| POST | `/manju/styleGuide/upload-reference` | 上传画风参考图 |

### 14.10 导出服务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/manju/export/project/{id}/json` | 导出完整项目 |
| GET | `/manju/export/project/{id}/prompts` | 导出提示词包 |
| GET | `/manju/export/project/{id}/comfyui-workflow` | 导出ComfyUI工作流 |
| GET | `/manju/export/project/{id}/jianying` | 导出剪映时间线 |
| POST | `/manju/export/import` | 导入项目 |

### 14.11 AI Agent

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/manju/agent/script/generate` | 剧本Agent - 生成剧本骨架 |
| POST | `/manju/agent/script/analyze` | 剧本Agent - 分析剧本 |
| POST | `/manju/agent/script/extract-characters` | 剧本Agent - 提取角色 |
| POST | `/manju/agent/production/generateStoryboard` | 生产Agent - 生成分镜 |
| POST | `/manju/agent/production/generate-assets` | 生产Agent - 生成资产 |
| POST | `/manju/agent/production/generate-prompts` | 生产Agent - 生成提示词 |

---

## 十五、常见问题与排查

### Q1：ComfyUI 连接失败

**现象**：提交任务时提示「ComfyUI服务未连接」

**排查步骤**：
1. 确认 ComfyUI 正在运行：访问 `http://localhost:8188`
2. 检查 ComfyUI 启动参数是否包含 `--listen 0.0.0.0`
3. 确认后端配置中的 ComfyUI 地址正确
4. 检查防火墙是否放行了 8188 端口

### Q2：AI Agent 调用失败

**现象**：点击「生成剧本」等AI按钮时报错

**排查步骤**：
1. 确认后端已配置 AI 模型的 API Key
2. 检查网络连接是否正常
3. 查看后端日志：`backend/logs/` 目录
4. 确认 Agent 部署设置：`GET /api/setting/agentDeploy`

### Q3：生图速度很慢

**现象**：Krea2 生图任务长时间处于 running 状态

**排查步骤**：
1. 检查 GPU 显存：`GET /api/comfyui/status` 查看 `vram_free`
2. 降低分辨率（如从 1024×576 降到 512×288）
3. 确认没有其他任务占用 GPU
4. Krea2 使用 8 步 Turbo 模式，正常应在 10-30 秒内完成

### Q4：SUPIR 放大失败

**现象**：SUPIR 任务报错

**排查步骤**：
1. SUPIR 需要 16GB+ 显存，确认 GPU 满足要求
2. 降低放大倍数（从 4x 改为 2x）
3. 确保输入图片格式正确（PNG/JPG）

### Q5：提示词包含禁用词

**现象**：提示词生成后检测到禁用词

**处理方式**：
1. 系统会自动标记检测到的禁用词
2. 手动编辑提示词，替换或删除禁用词
3. 使用「检查禁用词」功能验证修改后的提示词

### Q6：导出文件无法导入剪映

**现象**：剪映无法识别导出的时间线文件

**排查步骤**：
1. 确认导出格式选择的是「剪映时间线」
2. 检查视频文件路径是否正确
3. 剪映版本需要支持 JSON 时间线导入
4. 尝试使用剪映专业版

### Q7：节点数据不显示

**现象**：画布上的节点显示空白

**排查步骤**：
1. 确认节点已关联到有效的项目和剧本
2. 刷新页面重新加载数据
3. 检查浏览器控制台是否有报错信息
4. 确认后端 API 正常响应

---

## 附录A：项目目录结构

```
manju-studio/
├── backend/
│   ├── src/
│   │   ├── routes/manju/          # 核心业务路由
│   │   │   ├── agent.ts           # AI Agent 集成
│   │   │   ├── script.ts          # 剧本管理
│   │   │   ├── character.ts       # 角色管理
│   │   │   ├── scene.ts           # 场景管理
│   │   │   ├── storyboard.ts      # 分镜管理
│   │   │   ├── prompt.ts          # 提示词生成
│   │   │   ├── comfyui.ts         # ComfyUI 桥接
│   │   │   ├── process.ts         # 流程导航
│   │   │   ├── export.ts          # 导出服务
│   │   │   └── styleGuide.ts      # 画风管理
│   │   ├── services/manju/        # 业务服务层
│   │   │   ├── scriptSkeletonService.ts
│   │   │   ├── expressionService.ts
│   │   │   ├── storyboardDesignerService.ts
│   │   │   ├── promptFactoryService.ts
│   │   │   └── styleGuideService.ts
│   │   ├── agents/                # AI Agent 实现
│   │   │   ├── scriptAgent/
│   │   │   └── productionAgent/
│   │   └── services/
│   │       └── comfyui.ts         # ComfyUI 通信服务
│   └── data/
│       ├── comfyui-workflows/     # ComfyUI 工作流模板
│       │   ├── krea2_t2i.json
│       │   ├── qwen_edit.json
│       │   ├── supir_upscale.json
│       │   └── minimax_h3_t2v.json
│       └── skills/                # Agent 技能定义
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── canvas/            # 画布节点组件
│       │   │   ├── ScriptNode.tsx
│       │   │   ├── CharacterNode.tsx
│       │   │   ├── SceneNode.tsx
│       │   │   ├── ShotNode.tsx
│       │   │   ├── PromptNode.tsx
│       │   │   ├── EditNode.tsx
│       │   │   └── ComfyUITaskNode.tsx
│       │   ├── editors/           # 编辑器弹窗
│       │   │   ├── ScriptEditor.tsx
│       │   │   ├── CharacterEditor.tsx
│       │   │   └── SceneEditor.tsx
│       │   └── manju/             # 功能面板
│       │       ├── ProcessNavigator.tsx
│       │       └── ExportPanel.tsx
│       └── services/
│           └── api.ts             # 统一API服务层
└── docs/
    ├── ARCHITECTURE.md            # 架构文档
    └── COMFYUI_INTEGRATION.md     # ComfyUI集成文档
```

---

## 附录B：快捷键参考

| 快捷键 | 功能 |
|--------|------|
| 鼠标中键拖拽 | 平移画布 |
| 滚轮 | 缩放画布 |
| 右键空白处 | 新建节点菜单 |
| Delete | 删除选中节点 |
| Shift+左键 | 多选节点 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |

---

**文档版本**：v1.0  
**创建日期**：2026-08-25  
**适用版本**：Manju Studio v1.0
