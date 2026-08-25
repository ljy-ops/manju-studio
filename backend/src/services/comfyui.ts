import WebSocket from 'ws';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

interface ComfyUIWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'image' | 'video' | 'audio' | 'edit';
  nodes: Record<string, ComfyUINode>;
  parameters: WorkflowParameter[];
  outputs: WorkflowOutput[];
}

class ComfyUIBridge {
  private ws: WebSocket | null = null;
  private clientId: string;
  private baseUrl: string;
  private wsUrl: string;
  private tasks: Map<string, ComfyUITask> = new Map();
  private workflows: Map<string, ComfyUIWorkflowTemplate> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.clientId = `manju-${uuidv4()}`;
    this.baseUrl = process.env.COMFYUI_BASE_URL || 'http://localhost:8188';
    this.wsUrl = process.env.COMFYUI_WS_URL || 'ws://localhost:8188/ws';
    this.loadWorkflows();
  }

  // 连接WebSocket
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.wsUrl}?clientId=${this.clientId}`);

        this.ws.on('open', () => {
          console.log('[ComfyUI] WebSocket connected');
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('[ComfyUI] Failed to parse message:', error);
          }
        });

        this.ws.on('error', (err) => {
          console.error('[ComfyUI] WebSocket error:', err.message);
          this.scheduleReconnect();
          reject(err);
        });

        this.ws.on('close', () => {
          console.log('[ComfyUI] WebSocket closed');
          this.scheduleReconnect();
        });
      } catch (error) {
        console.error('[ComfyUI] Connection failed:', error);
        this.scheduleReconnect();
        reject(error);
      }
    });
  }

  // 自动重连
  private scheduleReconnect(): void {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('[ComfyUI] Attempting to reconnect...');
        this.connect().catch(() => {});
      }, 5000);
    }
  }

  // 处理WebSocket消息
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'status':
        // 队列状态更新
        break;

      case 'progress':
        // 更新任务进度
        const progressTask = Array.from(this.tasks.values()).find(t => t.status === 'running');
        if (progressTask && message.data.prompt_id) {
          progressTask.progress = message.data.value / message.data.max;
          progressTask.updatedAt = new Date();
        }
        break;

      case 'executing':
        // 节点开始执行
        break;

      case 'executed':
        // 节点执行完成
        if (message.data && message.data.prompt_id) {
          this.handleNodeExecuted(message.data);
        }
        break;

      case 'execution_error':
        // 执行错误
        const errorTask = Array.from(this.tasks.values()).find(t => t.status === 'running');
        if (errorTask) {
          errorTask.status = 'failed';
          errorTask.error = message.data.exception_message || 'Execution failed';
          errorTask.updatedAt = new Date();
        }
        break;
    }
  }

  // 处理节点执行完成
  private handleNodeExecuted(data: any): void {
    const task = Array.from(this.tasks.values()).find(t => t.status === 'running');
    if (!task) return;

    const workflow = this.workflows.get(task.workflowId);
    if (!workflow) return;

    // 检查是否是输出节点
    const output = workflow.outputs.find(o => o.nodeId === data.node);
    if (output && data.output) {
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
      console.log(`[ComfyUI] Task ${task.id} completed`);
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
      console.log(`[ComfyUI] Task ${taskId} submitted to ComfyUI`);

      return taskId;
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message || 'Failed to submit task';
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
        if (node && node.inputs) {
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

  // 获取所有任务
  getAllTasks(): ComfyUITask[] {
    return Array.from(this.tasks.values());
  }

  // 获取任务结果
  async getTaskResult(taskId: string): Promise<any> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'completed') {
      throw new Error(`Task ${taskId} is not completed (status: ${task.status})`);
    }

    // 下载输出文件
    const result: Record<string, any> = {};
    
    if (task.result) {
      for (const [key, value] of Object.entries(task.result)) {
        if (Array.isArray(value) && value.length > 0) {
          const file = value[0];
          try {
            const url = `${this.baseUrl}/view?filename=${encodeURIComponent(file.filename)}&type=${file.type || 'output'}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            result[key] = {
              filename: file.filename,
              type: file.type,
              data: Buffer.from(response.data).toString('base64')
            };
          } catch (error: any) {
            console.error(`[ComfyUI] Failed to download ${file.filename}:`, error.message);
            result[key] = { error: error.message };
          }
        }
      }
    }

    return result;
  }

  // 取消任务
  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === 'running' || task.status === 'pending') {
      try {
        await axios.post(`${this.baseUrl}/interrupt`, {});
        task.status = 'failed';
        task.error = 'Task cancelled by user';
        task.updatedAt = new Date();
      } catch (error: any) {
        throw new Error(`Failed to cancel task: ${error.message}`);
      }
    }
  }

  // 获取工作流列表
  getWorkflows(): ComfyUIWorkflowTemplate[] {
    return Array.from(this.workflows.values());
  }

  // 获取单个工作流
  getWorkflow(workflowId: string): ComfyUIWorkflowTemplate | undefined {
    return this.workflows.get(workflowId);
  }

  // 加载工作流模板
  private async loadWorkflows(): Promise<void> {
    const workflowsDir = path.join(__dirname, '../../data/comfyui-workflows');
    
    try {
      if (!fs.existsSync(workflowsDir)) {
        console.warn(`[ComfyUI] Workflows directory not found: ${workflowsDir}`);
        return;
      }

      const files = fs.readdirSync(workflowsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(workflowsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const workflow = JSON.parse(content) as ComfyUIWorkflowTemplate;
            this.workflows.set(workflow.id, workflow);
            console.log(`[ComfyUI] Loaded workflow: ${workflow.name}`);
          } catch (error: any) {
            console.warn(`[ComfyUI] Failed to load workflow ${file}:`, error.message);
          }
        }
      }

      console.log(`[ComfyUI] Loaded ${this.workflows.size} workflows`);
    } catch (error: any) {
      console.error('[ComfyUI] Failed to load workflows:', error.message);
    }
  }

  // 检查ComfyUI连接状态
  async checkStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/system_stats`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // 获取系统状态
  async getSystemStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/system_stats`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  // 清理过期任务
  cleanupOldTasks(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [taskId, task] of this.tasks.entries()) {
      if (now - task.createdAt.getTime() > maxAge) {
        this.tasks.delete(taskId);
      }
    }
  }
}

// 导出单例
const comfyuiBridge = new ComfyUIBridge();

// 自动连接
comfyuiBridge.connect().catch(() => {
  console.warn('[ComfyUI] Initial connection failed, will retry...');
});

// 定期清理过期任务（每小时）
setInterval(() => {
  comfyuiBridge.cleanupOldTasks();
}, 60 * 60 * 1000);

export default comfyuiBridge;
