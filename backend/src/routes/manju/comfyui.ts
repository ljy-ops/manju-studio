import express from 'express';
import { z } from 'zod';
import comfyui from '@/services/comfyui';
import { success, error } from '@/lib/responseFormat';
import { validateFields } from '@/middleware/middleware';

const router = express.Router();

// ============================================================================
// POST /api/comfyui/submit - 提交ComfyUI任务
// ============================================================================
router.post(
  '/submit',
  validateFields({
    workflowId: z.string(),
    parameters: z.record(z.any()),
  }),
  async (req, res) => {
    try {
      const { workflowId, parameters } = req.body;

      // 检查ComfyUI连接状态
      const isConnected = await comfyui.checkStatus();
      if (!isConnected) {
        return res.status(503).send(error('ComfyUI服务未连接，请检查ComfyUI是否正在运行'));
      }

      // 提交任务
      const taskId = await comfyui.submitTask(workflowId, parameters);

      res.status(200).send(success({
        taskId,
        message: '任务已提交',
      }));
    } catch (err: any) {
      console.error('[ComfyUI API] Submit failed:', err);
      res.status(500).send(error(err.message || '提交任务失败'));
    }
  }
);

// ============================================================================
// GET /api/comfyui/task/:taskId - 查询任务状态
// ============================================================================
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = comfyui.getTask(taskId);

    if (!task) {
      return res.status(404).send(error('任务不存在'));
    }

    res.status(200).send(success({
      id: task.id,
      workflowId: task.workflowId,
      status: task.status,
      progress: task.progress,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  } catch (err: any) {
    console.error('[ComfyUI API] Get task failed:', err);
    res.status(500).send(error(err.message || '查询任务失败'));
  }
});

// ============================================================================
// GET /api/comfyui/task/:taskId/result - 获取任务结果
// ============================================================================
router.get('/task/:taskId/result', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = comfyui.getTask(taskId);

    if (!task) {
      return res.status(404).send(error('任务不存在'));
    }

    if (task.status !== 'completed') {
      return res.status(400).send(error(`任务未完成，当前状态: ${task.status}`));
    }

    const result = await comfyui.getTaskResult(taskId);

    res.status(200).send(success({
      taskId: task.id,
      workflowId: task.workflowId,
      result,
    }));
  } catch (err: any) {
    console.error('[ComfyUI API] Get result failed:', err);
    res.status(500).send(error(err.message || '获取结果失败'));
  }
});

// ============================================================================
// POST /api/comfyui/task/:taskId/cancel - 取消任务
// ============================================================================
router.post('/task/:taskId/cancel', async (req, res) => {
  try {
    const { taskId } = req.params;
    await comfyui.cancelTask(taskId);

    res.status(200).send(success({ message: '任务已取消' }));
  } catch (err: any) {
    console.error('[ComfyUI API] Cancel failed:', err);
    res.status(500).send(error(err.message || '取消任务失败'));
  }
});

// ============================================================================
// GET /api/comfyui/tasks - 获取所有任务列表
// ============================================================================
router.get('/tasks', async (req, res) => {
  try {
    const tasks = comfyui.getAllTasks();

    res.status(200).send(success({
      tasks: tasks.map(t => ({
        id: t.id,
        workflowId: t.workflowId,
        status: t.status,
        progress: t.progress,
        error: t.error,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total: tasks.length,
    }));
  } catch (err: any) {
    console.error('[ComfyUI API] Get tasks failed:', err);
    res.status(500).send(error(err.message || '获取任务列表失败'));
  }
});

// ============================================================================
// GET /api/comfyui/workflows - 获取工作流列表
// ============================================================================
router.get('/workflows', async (req, res) => {
  try {
    const workflows = comfyui.getWorkflows();

    res.status(200).send(success({
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        category: w.category,
        parameters: w.parameters.map(p => ({
          id: p.id,
          type: p.type,
          label: p.label,
          default: p.default,
          options: p.options,
        })),
        outputs: w.outputs.map(o => ({
          type: o.type,
          label: o.label,
        })),
      })),
      total: workflows.length,
    }));
  } catch (err: any) {
    console.error('[ComfyUI API] Get workflows failed:', err);
    res.status(500).send(error(err.message || '获取工作流列表失败'));
  }
});

// ============================================================================
// GET /api/comfyui/workflow/:workflowId - 获取单个工作流详情
// ============================================================================
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = comfyui.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).send(error('工作流不存在'));
    }

    res.status(200).send(success(workflow));
  } catch (err: any) {
    console.error('[ComfyUI API] Get workflow failed:', err);
    res.status(500).send(error(err.message || '获取工作流详情失败'));
  }
});

// ============================================================================
// GET /api/comfyui/status - 检查ComfyUI连接状态
// ============================================================================
router.get('/status', async (req, res) => {
  try {
    const isConnected = await comfyui.checkStatus();
    
    let systemStats = null;
    if (isConnected) {
      try {
        systemStats = await comfyui.getSystemStats();
      } catch (e) {
        // 忽略获取系统状态的错误
      }
    }

    res.status(200).send(success({
      connected: isConnected,
      systemStats,
    }));
  } catch (err: any) {
    console.error('[ComfyUI API] Status check failed:', err);
    res.status(500).send(error(err.message || '检查状态失败'));
  }
});

export default router;
