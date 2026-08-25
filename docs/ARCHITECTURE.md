# Manju Studio 混合架构集成方案

## 一、架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    前端层 (TwitCanva)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React + TypeScript + Vite                           │   │
│  │  - 无限画布引擎 (Canvas Engine)                      │   │
│  │  - 节点系统 (Node System)                            │   │
│  │  - 工作流管理 (Workflow Management)                  │   │
│  │  - 素材库 (Asset Library)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↕ HTTP/WebSocket                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  新增模块                                             │   │
│  │  - 剧本工作台 (Script Workbench)                     │   │
│  │  - 流程导航 (Process Navigator)                      │   │
│  │  - 资产管理 (Asset Management)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    后端层 (Toonflow)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express + Socket.io + SQLite                        │   │
│  │  - 项目管理 (Project Management)                     │   │
│  │  - 剧本管理 (Script Management)                      │   │
│  │  - 分镜管理 (Storyboard Management)                  │   │
│  │  - 资产管理 (Asset Management)                       │   │
│  │  - AI Agent系统 (Script/Production Agent)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↕                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  新增模块                                             │   │
│  │  - 流程状态管理 (Process State)                      │   │
│  │  - ComfyUI桥接 (ComfyUI Bridge)                      │   │
│  │  - 导出服务 (Export Service)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    模型层 (ComfyUI + Cloud)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Krea2       │  │  Qwen Edit   │  │  SUPIR       │      │
│  │  (本地)      │  │  (本地)      │  │  (本地)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  MiniMax H3  │  │  其他云端    │                        │
│  │  (云端API)   │  │  (可选)      │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## 二、通信架构

### 2.1 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Toonflow后端 | 10588 | 主业务API |
| TwitCanva前端 | 3001 | 画布引擎API |
| ComfyUI | 8188 | 本地模型推理 |
| 统一网关 | 8080 | Nginx反向代理（可选） |

### 2.2 API路由规划

#### 前端API (TwitCanva - 3001端口)
```
/api/canvas/*          - 画布操作
/api/nodes/*           - 节点管理
/api/workflows/*       - 工作流管理
/api/library/*         - 素材库
```

#### 后端API (Toonflow - 10588端口)
```
/api/project/*         - 项目管理
/api/script/*          - 剧本管理
/api/storyboard/*      - 分镜管理
/api/assets/*          - 资产管理
/api/process/*         - 流程管理 (新增)
/api/comfyui/*         - ComfyUI桥接 (新增)
/api/export/*          - 导出服务 (新增)
```

### 2.3 数据流向

```
用户操作 → 前端画布 → 前端API (3001)
                    ↓
              后端API (10588) → SQLite数据库
                    ↓
              ComfyUI (8188) → 模型推理
                    ↓
              结果返回 → 前端展示
```

## 三、数据模型映射

### 3.1 项目数据 (Project)

**Toonflow数据库表:**
```sql
o_project (
  id, name, type, intro, artStyle, videoRatio,
  imageModel, videoModel, imageQuality, createTime
)
```

**前端状态:**
```typescript
interface Project {
  id: number;
  name: string;
  type: string;
  intro: string;
  artStyle: string;
  videoRatio: string;
  imageModel: string;
  videoModel: string;
}
```

### 3.2 剧本数据 (Script)

**Toonflow数据库表:**
```sql
o_script (
  id, projectId, name, content, createTime,
  extractState, errorReason
)
```

**前端扩展:**
```typescript
interface Script {
  id: number;
  projectId: number;
  name: string;
  content: string;
  // 新增字段
  skeleton?: Episode[];        // 剧本骨架
  rhythm?: RhythmPoint[];      // 节奏曲线
  characterArcs?: CharacterArc[]; // 角色弧光
  beats?: Beat[];              // 节拍列表
  diagnostics?: Diagnostic[];  // 诊断结果
}
```

### 3.3 分镜数据 (Storyboard)

**Toonflow数据库表:**
```sql
o_storyboard (
  id, projectId, scriptId, index, prompt,
  videoDesc, duration, filePath, state,
  track, trackId, createTime
)
```

**前端扩展:**
```typescript
interface Storyboard {
  id: number;
  projectId: number;
  scriptId: number;
  index: number;
  prompt: string;
  videoDesc: string;
  duration: string;
  // 新增字段
  shotSize: string;            // 景别
  cameraMovement: string;      // 镜头运动
  characters: string[];        // 出场角色
  location: string;            // 场景位置
  emotionIntensity: number;    // 情绪强度
  continuityMode: string;      // 续接模式
  compositionRef?: string;     // 构图参考图
  previewImage?: string;       // 预览图
  finalVideo?: string;         // 最终视频
}
```

### 3.4 资产数据 (Assets)

**Toonflow数据库表:**
```sql
o_assets (
  id, projectId, name, type, describe,
  prompt, imageId, audioBindState
)
```

**前端扩展:**
```typescript
interface Asset {
  id: number;
  projectId: number;
  name: string;
  type: 'character' | 'scene' | 'prop';
  describe: string;
  prompt: string;
  // 角色特有
  forms?: CharacterForm[];     // 多形象
  microLifeProfile?: MicroLifeProfile; // 活人感档案
  // 场景特有
  views?: SceneView[];         // 720度视角
  geoLayout?: string;          // GEO布局
  lighting?: string;           // 光线逻辑
}
```

### 3.5 流程数据 (Process) - 新增

**新增数据库表:**
```sql
o_process (
  id, projectId, stage, status,
  completedAt, nextAction, metadata
)
```

**前端状态:**
```typescript
interface ProcessStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  nextAction?: string;
  progress?: number;
}

const PROCESS_STAGES = [
  { id: '1', name: '选题确认' },
  { id: '2a', name: '剧本骨架生成' },
  { id: '2b', name: '节奏编排' },
  { id: '2c', name: '角色弧光设计' },
  { id: '2d', name: '节拍级表演定义' },
  { id: '2e', name: '剧本诊断' },
  { id: '3', name: '画风锁定' },
  { id: '4', name: '角色资产' },
  { id: '5', name: '场景资产' },
  { id: '6', name: '道具资产' },
  { id: '7', name: '分镜设计' },
  { id: '8', name: '对白管理' },
  { id: '9', name: '提示词生成' },
  { id: '10', name: '智能分镜预览' },
  { id: '11', name: '生图执行' },
  { id: '12', name: '图片编辑' },
  { id: '13', name: '画质增强' },
  { id: '14', name: '生视频' },
  { id: '15', name: '导出' },
];
```

## 四、ComfyUI桥接层设计

### 4.1 架构

```
后端API (/api/comfyui/*)
    ↓
ComfyUI Bridge Service
    ↓
ComfyUI WebSocket API (ws://localhost:8188/ws)
    ↓
模型推理 (Krea2/Qwen Edit/SUPIR)
```

### 4.2 API接口

```typescript
// 提交生图任务
POST /api/comfyui/generate
{
  "workflow": "krea2_t2i",  // 工作流名称
  "params": {
    "prompt": "...",
    "negative_prompt": "...",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "cfg_scale": 1.0
  }
}

// 查询任务状态
GET /api/comfyui/task/:taskId

// 获取任务结果
GET /api/comfyui/result/:taskId
```

### 4.3 工作流定义

```typescript
interface ComfyUIWorkflow {
  name: string;
  description: string;
  nodes: ComfyUINode[];
  connections: ComfyUIConnection[];
}

interface ComfyUINode {
  id: string;
  type: string;  // e.g., "KSampler", "CLIPTextEncode"
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}
```

### 4.4 预定义工作流

1. **Krea2 Text-to-Image**
   - 输入：提示词、分辨率
   - 输出：生成图片

2. **Qwen Edit 2511**
   - 输入：原图、编辑指令、遮罩
   - 输出：编辑后图片

3. **SUPIR Upscale**
   - 输入：低分辨率图片
   - 输出：4K-8K高清图片

4. **MiniMax H3 Video**
   - 输入：首帧图片、提示词、时长
   - 输出：视频文件

## 五、实施计划

### Phase 1: 基础集成 (1-2天)
- [ ] 配置CORS和跨域访问
- [ ] 建立前后端API通信
- [ ] 统一数据格式
- [ ] 测试基础CRUD操作

### Phase 2: 前端扩展 (2-3天)
- [ ] 新增剧本工作台面板
- [ ] 新增流程导航组件
- [ ] 扩展节点类型（剧本/角色/场景/分镜）
- [ ] 实现节点与后端数据绑定

### Phase 3: 后端扩展 (2-3天)
- [ ] 新增流程管理API
- [ ] 新增ComfyUI桥接API
- [ ] 扩展数据库表结构
- [ ] 实现AI Agent集成

### Phase 4: ComfyUI集成 (2-3天)
- [ ] 实现ComfyUI WebSocket客户端
- [ ] 开发工作流模板系统
- [ ] 实现任务队列管理
- [ ] 测试各模型工作流

### Phase 5: 流程导航 (1-2天)
- [ ] 实现15阶段状态追踪
- [ ] 实现智能提示系统
- [ ] 实现阶段跳转功能
- [ ] 测试完整流程

### Phase 6: 导出与测试 (1-2天)
- [ ] 实现ComfyUI工作流导出
- [ ] 实现剪映格式转换
- [ ] 端到端测试
- [ ] 性能优化

## 六、技术栈总结

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + TypeScript + Vite | 画布引擎 |
| 后端 | Express + Socket.io + SQLite | 业务逻辑 |
| 模型 | ComfyUI + Krea2 + Qwen Edit + SUPIR | 本地推理 |
| 云端 | MiniMax H3 API | 视频生成 |
| 通信 | HTTP REST + WebSocket | 数据同步 |

## 七、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 跨域问题 | 前后端通信失败 | 配置CORS，使用统一网关 |
| 数据不一致 | 前后端状态不同步 | WebSocket实时同步，乐观更新 |
| ComfyUI性能 | 推理速度慢 | 任务队列，异步处理，进度反馈 |
| 模型兼容性 | 工作流不兼容 | 版本检测，降级方案 |
| 内存占用 | 大文件处理崩溃 | 流式处理，分片上传 |

## 八、下一步行动

1. **立即执行**: Phase 1 基础集成
   - 配置后端CORS
   - 建立API代理
   - 测试数据流通

2. **并行开发**: 
   - 前端：剧本工作台UI
   - 后端：流程管理API
   - ComfyUI：桥接层开发

3. **里程碑**:
   - Day 1-2: 基础集成完成
   - Day 3-5: 前端扩展完成
   - Day 6-8: 后端扩展完成
   - Day 9-11: ComfyUI集成完成
   - Day 12-13: 流程导航完成
   - Day 14: 完整测试

---

**文档版本**: v1.0  
**创建日期**: 2026-08-24  
**状态**: 设计中
