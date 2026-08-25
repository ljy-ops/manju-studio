/**
 * AI Agent 集成路由
 * 提供剧本Agent和生产Agent的HTTP API接口
 */

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';
import { runDecisionAI as runScriptAgent } from '../../agents/scriptAgent/index';
import { runDecisionAI as runProductionAgent } from '../../agents/productionAgent/index';
import ResTool from '../../socket/resTool';
import { Server } from 'socket.io';

const router = Router();

// 创建虚拟Socket用于Agent调用
class VirtualSocket {
  private handlers: Map<string, Function> = new Map();
  
  emit(event: string, data: any, callback?: Function) {
    console.log(`[VirtualSocket] emit: ${event}`, data);
    if (callback) callback({ success: true });
  }
  
  on(event: string, handler: Function) {
    this.handlers.set(event, handler);
  }
}

// 创建虚拟ResTool
function createVirtualResTool(data: any = {}) {
  const socket = new VirtualSocket() as any;
  const resTool = new ResTool(socket);
  resTool.data = data;
  return resTool;
}

// 剧本Agent - 生成剧本骨架
router.post('/script/generate', async (req: Request, res: Response) => {
  try {
    const { scriptId, templateId, episodeCount, duration } = req.body;

    if (!scriptId) {
      return res.json(error('缺少剧本ID'));
    }

    const script = await db('o_script')
      .where('id', scriptId)
      .first();

    if (!script) {
      return res.json(error('剧本不存在'));
    }

    const resTool = createVirtualResTool({ scriptId });
    
    // 构建Agent调用指令
    const instruction = `生成剧本骨架，使用${templateId || 'custom'}模板，${episodeCount || 1}集，每集${duration || '3min'}`;

    await runScriptAgent({
      socket: new VirtualSocket() as any,
      isolationKey: `script_${scriptId}`,
      text: instruction,
      resTool,
      msg: resTool.newMessage('agent'),
      thinkConfig: { think: false, thinlLevel: 0 }
    });

    // 获取生成的结果
    const updatedScript = await db('o_script')
      .where('id', scriptId)
      .first();

    const scriptData = JSON.parse(updatedScript.content || '{}');

    return res.json(success({
      message: '剧本骨架生成完成',
      scriptData
    }));
  } catch (err: any) {
    console.error('剧本Agent调用失败:', err);
    return res.json(error(err.message));
  }
});

// 剧本Agent - 智能分析剧本
router.post('/script/analyze', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.body;

    if (!scriptId) {
      return res.json(error('缺少剧本ID'));
    }

    const script = await db('o_script')
      .where('id', scriptId)
      .first();

    if (!script) {
      return res.json(error('剧本不存在'));
    }

    const resTool = createVirtualResTool({ scriptId });
    const instruction = `分析剧本结构，检查节奏、角色弧光、冲突设计等`;

    await runScriptAgent({
      socket: new VirtualSocket() as any,
      isolationKey: `script_analyze_${scriptId}`,
      text: instruction,
      resTool,
      msg: resTool.newMessage('agent'),
      thinkConfig: { think: true, thinlLevel: 1 }
    });

    return res.json(success({
      message: '剧本分析完成'
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 生产Agent - 批量生成分镜
router.post('/production/generateStoryboard', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId } = req.body;

    if (!projectId || !scriptId) {
      return res.json(error('缺少项目ID或剧本ID'));
    }

    const resTool = createVirtualResTool({ projectId, scriptId });
    const instruction = `根据剧本自动生成分镜，包括景别、镜头运动、角色位置等`;

    await runProductionAgent({
      socket: new VirtualSocket() as any,
      isolationKey: `production_${projectId}_${scriptId}`,
      text: instruction,
      resTool,
      msg: resTool.newMessage('agent'),
      thinkConfig: { think: false, thinlLevel: 0 }
    });

    // 获取生成的分镜
    const shots = await db('o_storyboard')
      .where({ projectId, scriptId })
      .orderBy('index', 'asc');

    return res.json(success({
      message: '分镜生成完成',
      shots: shots.map(shot => ({
        ...shot,
        shotData: JSON.parse(shot.videoDesc || '{}')
      }))
    }));
  } catch (err: any) {
    console.error('生产Agent调用失败:', err);
    return res.json(error(err.message));
  }
});

// 生产Agent - 生成资产
router.post('/production/generateAssets', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId } = req.body;

    if (!projectId || !scriptId) {
      return res.json(error('缺少项目ID或剧本ID'));
    }

    const resTool = createVirtualResTool({ projectId, scriptId });
    const instruction = `从剧本中提取角色和场景，生成资产`;

    await runProductionAgent({
      socket: new VirtualSocket() as any,
      isolationKey: `production_assets_${projectId}_${scriptId}`,
      text: instruction,
      resTool,
      msg: resTool.newMessage('agent'),
      thinkConfig: { think: false, thinlLevel: 0 }
    });

    // 获取生成的资产
    const characters = await db('o_assets')
      .where({ projectId, type: 'role' });

    const scenes = await db('o_assets')
      .where({ projectId, type: 'scene' });

    return res.json(success({
      message: '资产生成完成',
      characters,
      scenes
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 生产Agent - 批量生成提示词
router.post('/production/generatePrompts', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId } = req.body;

    if (!projectId || !scriptId) {
      return res.json(error('缺少项目ID或剧本ID'));
    }

    const resTool = createVirtualResTool({ projectId, scriptId });
    const instruction = `为所有分镜生成Krea2、MiniMax H3、Qwen Edit提示词`;

    await runProductionAgent({
      socket: new VirtualSocket() as any,
      isolationKey: `production_prompts_${projectId}_${scriptId}`,
      text: instruction,
      resTool,
      msg: resTool.newMessage('agent'),
      thinkConfig: { think: false, thinlLevel: 0 }
    });

    // 获取生成的提示词
    const shots = await db('o_storyboard')
      .where({ projectId, scriptId })
      .orderBy('index', 'asc');

    return res.json(success({
      message: '提示词生成完成',
      shots: shots.map(shot => ({
        ...shot,
        shotData: JSON.parse(shot.videoDesc || '{}')
      }))
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
