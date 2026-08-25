# ComfyUI 本地模型接入方案

## 一、架构概览

```
┌─────────────────────────────────────────────────────────┐
│              Manju Studio 前端 (TwitCanva)               │
│  - 画布节点 → 触发ComfyUI工作流                          │
│  - 实时进度展示                                          │
│  - 结果预览和回嵌                                        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│              Toonflow 后端 (Express)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ComfyUI Bridge Service                          │   │
│  │  - 工作流模板管理                                  │   │
│  │  - 任务队列管理                                    │   │
│  │  - 状态追踪                                        │   │
│  │  - 结果收集                                        │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │ WebSocket (ws://localhost:8188/ws)
┌─────────────────────▼───────────────────────────────────┐
│              ComfyUI 本地服务                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │  工作流 A: Flux + PuLID (分镜静帧)               │    │
│  │  工作流 B: LTX-2.3 (视频生成)                    │    │
│  │  工作流 C: CosyVoice2 (配音)                     │    │
│  │  工作流 D: Krea2 (文生图)                        │    │
│  │  工作流 E: Qwen Edit (图片编辑)                  │    │
│  │  工作流 F: SUPIR (画质增强)                      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 二、ComfyUI API 协议

### 2.1 WebSocket 连接

```typescript
// 连接到ComfyUI
const ws = new WebSocket('ws://localhost:8188/ws?clientId=manju-studio');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 处理消息类型：status, progress, executing, executed
};
```

### 2.2 消息类型

| 类型 | 说明 | 数据结构 |
|------|------|---------|
| `status` | 执行状态 | `{ type: 'status', data: { status: { exec_info: { queue_remaining } } } }` |
| `progress` | 执行进度 | `{ type: 'progress', data: { value, max } }` |
| `executing` | 节点执行 | `{ type: 'executing', data: { node, prompt_id } }` |
| `executed` | 节点完成 | `{ type: 'executed', data: { node, output, prompt_id } }` |

### 2.3 HTTP API

```bash
# 提交工作流
POST /prompt
{
  "prompt": { ... workflow nodes ... },
  "client_id": "manju-studio"
}

# 查询队列
GET /queue

# 查询历史
GET /history

# 获取输出文件
GET /view?filename=xxx&type=output
```

## 三、工作流模板设计

### 3.1 模板结构

```typescript
interface ComfyUIWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'image' | 'video' | 'audio' | 'edit';
  nodes: Record<string, ComfyUINode>;
  parameters: WorkflowParameter[];
  outputs: WorkflowOutput[];
}

interface ComfyUINode {
  class_type: string;
  inputs: Record<string, any>;
  _meta?: { title: string };
}

interface WorkflowParameter {
  id: string;
  nodeId: string;
  field: string;
  type: 'text' | 'number' | 'image' | 'audio' | 'select';
  label: string;
  default?: any;
  options?: any[];
}

interface WorkflowOutput {
  nodeId: string;
  field: string;
  type: 'image' | 'video' | 'audio';
  label: string;
}
```

### 3.2 预定义工作流

#### 工作流 A: 分镜静帧 (Flux + PuLID)

```typescript
const workflowA: ComfyUIWorkflowTemplate = {
  id: 'storyboard_flux_pulid',
  name: '分镜静帧生成',
  description: '使用Flux+PuLID生成角色一致的分镜静帧',
  category: 'image',
  parameters: [
    { id: 'prompt', nodeId: '11', field: 'text', type: 'text', label: '正向提示词' },
    { id: 'negative', nodeId: '12', field: 'text', type: 'text', label: '负向提示词', default: '' },
    { id: 'character_ref', nodeId: '6', field: 'image', type: 'image', label: '角色定妆照' },
    { id: 'style_lora', nodeId: '4', field: 'lora_name', type: 'select', label: '画风LoRA' },
    { id: 'character_lora', nodeId: '5', field: 'lora_name', type: 'select', label: '角色LoRA' },
    { id: 'width', nodeId: '13', field: 'width', type: 'number', label: '宽度', default: 768 },
    { id: 'height', nodeId: '13', field: 'height', type: 'number', label: '高度', default: 1344 },
  ],
  outputs: [
    { nodeId: '16', field: 'images', type: 'image', label: '分镜静帧' }
  ]
};
```

#### 工作流 B: 视频生成 (LTX-2.3)

```typescript
const workflowB: ComfyUIWorkflowTemplate = {
  id: 'video_ltx23',
  name: '视频生成',
  description: '使用LTX-2.3从静帧+音频生成视频',
  category: 'video',
  parameters: [
    { id: 'first_frame', nodeId: '10', field: 'image', type: 'image', label: '首帧图片' },
    { id: 'audio', nodeId: '11', field: 'audio', type: 'audio', label: '台词音频' },
    { id: 'prompt', nodeId: '40', field: 'text', type: 'text', label: '动作描述+台词' },
    { id: 'width', nodeId: '20', field: 'width', type: 'number', label: '宽度', default: 544 },
    { id: 'height', nodeId: '20', field: 'height', type: 'number', label: '高度', default: 960 },
    { id: 'frames', nodeId: '31', field: 'length', type: 'number', label: '帧数', default: 121 },
  ],
  outputs: [
    { nodeId: '81', field: 'video', type: 'video', label: '生成视频' }
  ]
};
```

#### 工作流 C: 配音 (CosyVoice2)

```typescript
const workflowC: ComfyUIWorkflowTemplate = {
  id: 'voice_cosyvoice2',
  name: '台词配音',
  description: '使用CosyVoice2进行零样本语音克隆',
  category: 'audio',
  parameters: [
    { id: 'reference_audio', nodeId: '2', field: 'audio', type: 'audio', label: '音色参考音频' },
    { id: 'reference_text', nodeId: '3', field: 'prompt_text', type: 'text', label: '参考音频文本' },
    { id: 'tts_text', nodeId: '3', field: 'tts_text', type: 'text', label: '待配音文本' },
    { id: 'speaker', nodeId: '3', field: 'speaker', type: 'text', label: '说话人名称' },
  ],
  outputs: [
    { nodeId: '4', field: 'audio', type: 'audio', label: '生成音频' }
  ]
};
```

#### 工作流 D: Krea2 文生图

```typescript
const workflowD: ComfyUIWorkflowTemplate = {
  id: 'krea2_t2i',
  name: 'Krea2文生图',
  description: '使用Krea2模型生成高质量图像',
  category: 'image',
  parameters: [
    { id: 'prompt', nodeId: '6', field: 'text', type: 'text', label: '正向提示词' },
    { id: 'style_ref', nodeId: '7', field: 'image', type: 'image', label: '风格参考图' },
    { id: 'width', nodeId: '5', field: 'width', type: 'number', label: '宽度', default: 1024 },
    { id: 'height', nodeId: '5', field: 'height', type: 'number', label: '高度', default: 1024 },
    { id: 'steps', nodeId: '3', field: 'steps', type: 'number', label: '采样步数', default: 8 },
  ],
  outputs: [
    { nodeId: '9', field: 'images', type: 'image', label: '生成图像' }
  ]
};
```

#### 工作流 E: Qwen Edit 图片编辑

```typescript
const workflowE: ComfyUIWorkflowTemplate = {
  id: 'qwen_edit',
  name: 'Qwen图片编辑',
  description: '使用Qwen Edit 2511进行图片编辑',
  category: 'edit',
  parameters: [
    { id: 'source_image', nodeId: '1', field: 'image', type: 'image', label: '源图片' },
    { id: 'edit_instruction', nodeId: '2', field: 'text', type: 'text', label: '编辑指令' },
    { id: 'mask', nodeId: '3', field: 'image', type: 'image', label: '遮罩图(可选)' },
  ],
  outputs: [
    { nodeId: '5', field: 'images', type: 'image', label: '编辑后图片' }
  ]
};
```

#### 工作流 F: SUPIR 画质增强

```typescript
const workflowF: ComfyUIWorkflowTemplate = {
  id: 'supir_upscale',
  name: 'SUPIR画质增强',
  description: '使用SUPIR进行4K-8K画质增强',
  category: 'edit',
  parameters: [
    { id: 'source_image', nodeId: '1', field: 'image', type: 'image', label: '源图片' },
    { id: 'scale', nodeId: '3', field: 'scale_factor', type: 'number', label: '放大倍数', default: 4 },
  ],
  outputs: [
    { nodeId: '5', field: 'images', type: 'image', label: '增强后图片' }
  ]
};
```

## 四、ComfyUI Bridge Service 实现

### 4.1 核心类

```typescript
// backend/src/services/comfyui.ts

import WebSocket from 'ws';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface ComfyUITask {
  id: string;
  workflowId: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

class ComfyUIBridge {
  private ws: WebSocket | null = null;
  private clientId: string;
  private baseUrl: string;
  private tasks: Map<string, ComfyUITask> = new Map();
  private workflows: Map<string, ComfyUIWorkflowTemplate> = new Map();
  
  constructor(baseUrl: string = 'http://localhost:8188') {
    this.clientId = `manju-${uuidv4()}`;
    this.baseUrl = baseUrl;
    this.loadWorkflows();
  }
  
  // 连接WebSocket
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:8188/ws?clientId=${this.clientId}`);
      
      this.ws.on('open', () => {
        console.log('[ComfyUI] Connected');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
      
      this.ws.on('error', (err) => {
        console.error('[ComfyUI] WebSocket error:', err);
        reject(err);
      });
      
      this.ws.on('close', () => {
        console.log('[ComfyUI] Disconnected');
        // 自动重连
        setTimeout(() => this.connect(), 5000);
      });
    });
  }
  
  // 处理WebSocket消息
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'status':
        // 更新队列状态
        break;
        
      case 'progress':
        // 更新任务进度
        const task = Array.from(this.tasks.values()).find(t => t.status === 'running');
        if (task) {
          task.progress = message.data.value / message.data.max;
          task.updatedAt = new Date();
        }
        break;
        
      case 'executed':
        // 节点执行完成
        this.handleNodeExecuted(message.data);
        break;
    }
  }
  
  // 处理节点执行完成
  private async handleNodeExecuted(data: any): Promise<void> {
    const task = Array.from(this.tasks.values()).find(t => t.status === 'running');
    if (!task) return;
    
    const workflow = this.workflows.get(task.workflowId);
    if (!workflow) return;
    
    // 检查是否是输出节点
    const output = workflow.outputs.find(o => o.nodeId === data.node);
    if (output) {
      // 收集输出
      if (!task.result) task.result = {};
      task.result[output.label] = data.output[output.field];
    }
    
    // 检查是否所有输出节点都完成
    const allOutputsCollected = workflow.outputs.every(
      o => task.result && task.result[o.label]
    );
    
    if (allOutputsCollected) {
      task.status = 'completed';
      task.progress = 1;
      task.updatedAt = new Date();
    }
  }
  
  // 提交任务
  async submitTask(workflowId: string, parameters: Record<string, any>): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const taskId = uuidv4();
    const task: ComfyUITask = {
      id: taskId,
      workflowId,
      parameters,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.tasks.set(taskId, task);
    
    // 构建工作流
    const prompt = this.buildPrompt(workflow, parameters);
    
    // 提交到ComfyUI
    try {
      const response = await axios.post(`${this.baseUrl}/prompt`, {
        prompt,
        client_id: this.clientId
      });
      
      task.status = 'running';
      task.updatedAt = new Date();
      
      return taskId;
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.updatedAt = new Date();
      throw error;
    }
  }
  
  // 构建ComfyUI prompt
  private buildPrompt(workflow: ComfyUIWorkflowTemplate, parameters: Record<string, any>): any {
    const prompt = JSON.parse(JSON.stringify(workflow.nodes));
    
    // 应用参数
    for (const param of workflow.parameters) {
      if (parameters[param.id] !== undefined) {
        const node = prompt[param.nodeId];
        if (node) {
          node.inputs[param.field] = parameters[param.id];
        }
      }
    }
    
    return prompt;
  }
  
  // 查询任务状态
  getTask(taskId: string): ComfyUITask | undefined {
    return this.tasks.get(taskId);
  }
  
  // 获取任务结果
  async getTaskResult(taskId: string): Promise<any> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (task.status !== 'completed') {
      throw new Error(`Task ${taskId} is not completed`);
    }
    
    // 下载输出文件
    const result = {};
    for (const [key, value] of Object.entries(task.result)) {
      if (Array.isArray(value) && value.length > 0) {
        const file = value[0];
        const url = `${this.baseUrl}/view?filename=${file.filename}&type=${file.type}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        result[key] = Buffer.from(response.data);
      }
    }
    
    return result;
  }
  
  // 加载工作流模板
  private async loadWorkflows(): Promise<void> {
    // 从数据库或文件加载
    const workflowFiles = [
      'workflow_a_storyboard_flux_pulid.json',
      'workflow_b_video_ltx23_audio.json',
      'workflow_c_voice_cosyvoice2.json',
      'workflow_d_krea2_t2i.json',
      'workflow_e_qwen_edit.json',
      'workflow_f_supir_upscale.json'
    ];
    
    for (const file of workflowFiles) {
      try {
        const content = await fs.readFile(`./workflows/${file}`, 'utf-8');
        const workflow = JSON.parse(content);
        this.workflows.set(workflow.id, workflow);
      } catch (error) {
        console.warn(`Failed to load workflow ${file}:`, error.message);
      }
    }
  }
}

export default new ComfyUIBridge();
```

### 4.2 API 路由

```typescript
// backend/src/routes/comfyui.ts

import express from 'express';
import comfyui from '../services/comfyui';

const router = express.Router();

// 提交任务
router.post('/submit', async (req, res) => {
  try {
    const { workflowId, parameters } = req.body;
    const taskId = await comfyui.submitTask(workflowId, parameters);
    res.json({ success: true, taskId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 查询任务状态
router.get('/task/:taskId', (req, res) => {
  const task = comfyui.getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, task });
});

// 获取任务结果
router.get('/task/:taskId/result', async (req, res) => {
  try {
    const result = await comfyui.getTaskResult(req.params.taskId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 列出工作流
router.get('/workflows', (req, res) => {
  const workflows = Array.from(comfyui.workflows.values()).map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    category: w.category,
    parameters: w.parameters.map(p => ({
      id: p.id,
      type: p.type,
      label: p.label,
      default: p.default
    }))
  }));
  res.json({ success: true, workflows });
});

export default router;
```

## 五、前端集成

### 5.1 画布节点扩展

```typescript
// frontend/src/types.ts

export enum NodeType {
  // ... 现有节点类型
  COMFYUI_TASK = 'ComfyUI Task'
}

export interface NodeData {
  // ... 现有字段
  comfyuiTaskId?: string;
  comfyuiWorkflowId?: string;
  comfyuiParameters?: Record<string, any>;
  comfyuiStatus?: 'idle' | 'running' | 'completed' | 'failed';
  comfyuiProgress?: number;
  comfyuiResult?: any;
}
```

### 5.2 ComfyUI 任务节点组件

```typescript
// frontend/src/components/canvas/ComfyUITaskNode.tsx

export const ComfyUITaskNode: React.FC<NodeProps> = ({ data, onUpdate }) => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(data.comfyuiWorkflowId || '');
  
  useEffect(() => {
    // 加载可用工作流
    fetch('/api/comfyui/workflows')
      .then(res => res.json())
      .then(data => setWorkflows(data.workflows));
  }, []);
  
  const handleSubmit = async () => {
    const workflow = workflows.find(w => w.id === selectedWorkflow);
    if (!workflow) return;
    
    // 收集参数
    const parameters = {};
    for (const param of workflow.parameters) {
      parameters[param.id] = data.comfyuiParameters?.[param.id] || param.default;
    }
    
    // 提交任务
    const response = await fetch('/api/comfyui/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: selectedWorkflow, parameters })
    });
    
    const result = await response.json();
    if (result.success) {
      onUpdate({ comfyuiTaskId: result.taskId, comfyuiStatus: 'running' });
      pollTaskStatus(result.taskId);
    }
  };
  
  const pollTaskStatus = async (taskId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/comfyui/task/${taskId}`);
      const result = await response.json();
      
      if (result.success) {
        const task = result.task;
        onUpdate({
          comfyuiStatus: task.status,
          comfyuiProgress: task.progress
        });
        
        if (task.status === 'completed' || task.status === 'failed') {
          clearInterval(interval);
          
          if (task.status === 'completed') {
            // 获取结果
            const resultResponse = await fetch(`/api/comfyui/task/${taskId}/result`);
            const resultData = await resultResponse.json();
            onUpdate({ comfyuiResult: resultData.result });
          }
        }
      }
    }, 1000);
  };
  
  return (
    <div className="comfyui-task-node">
      <select value={selectedWorkflow} onChange={e => setSelectedWorkflow(e.target.value)}>
        <option value="">选择工作流...</option>
        {workflows.map(w => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      
      {data.comfyuiStatus === 'running' && (
        <div className="progress-bar">
          <div style={{ width: `${data.comfyuiProgress * 100}%` }} />
        </div>
      )}
      
      <button onClick={handleSubmit} disabled={data.comfyuiStatus === 'running'}>
        {data.comfyuiStatus === 'running' ? '执行中...' : '提交任务'}
      </button>
      
      {data.comfyuiResult && (
        <div className="result-preview">
          {/* 显示结果预览 */}
        </div>
      )}
    </div>
  );
};
```

## 六、部署与配置

### 6.1 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| ComfyUI | 最新 | 本地部署 |
| Python | 3.10+ | ComfyUI依赖 |
| CUDA | 11.8+ | GPU加速 |
| 显存 | 16GB+ | 推荐RTX 4090 |

### 6.2 启动顺序

1. 启动ComfyUI
   ```bash
   cd ComfyUI
   python main.py --listen 0.0.0.0 --port 8188
   ```

2. 启动Toonflow后端
   ```bash
   cd backend
   yarn dev
   ```

3. 启动TwitCanva前端
   ```bash
   cd frontend
   npm run dev
   ```

### 6.3 配置文件

```bash
# backend/.env
COMFYUI_BASE_URL=http://localhost:8188
COMFYUI_WS_URL=ws://localhost:8188/ws
```

## 七、性能优化

### 7.1 任务队列

- 使用Redis管理任务队列
- 支持优先级调度
- 支持任务重试

### 7.2 显存管理

- 工作流按需加载模型
- 支持模型卸载和切换
- 监控显存使用

### 7.3 缓存策略

- 缓存常用工作流
- 缓存生成结果
- 支持增量更新

## 八、监控与日志

### 8.1 监控指标

- 任务成功率
- 平均执行时间
- 显存使用率
- 队列长度

### 8.2 日志记录

- 任务提交日志
- 执行过程日志
- 错误日志
- 性能日志

---

**文档版本**: v1.0  
**创建日期**: 2026-08-24  
**状态**: 设计中
