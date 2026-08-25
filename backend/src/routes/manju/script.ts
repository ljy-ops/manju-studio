import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';
import { validate } from '../../middleware/validate';
import { scriptSkeletonService } from '../../services/manju/scriptSkeletonService';

const router = Router();

// 获取剧本列表
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.json(error('缺少项目ID'));
    }

    const scripts = await db('o_script')
      .where('projectId', projectId)
      .orderBy('createTime', 'desc');

    return res.json(success(scripts));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 创建剧本
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { projectId, title, templateId } = req.body;

    if (!projectId || !title) {
      return res.json(error('缺少必要参数'));
    }

    const [scriptId] = await db('o_script').insert({
      projectId,
      name: title,
      content: JSON.stringify({
        episodes: [],
        templateId,
        totalBeats: 0
      }),
      createTime: Date.now(),
      updateTime: Date.now()
    });

    return res.json(success({ scriptId }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 获取剧本详情
router.get('/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;

    const script = await db('o_script')
      .where('id', scriptId)
      .first();

    if (!script) {
      return res.json(error('剧本不存在'));
    }

    const scriptData = JSON.parse(script.content || '{}');

    return res.json(success({
      ...script,
      scriptData
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 更新剧本内容
router.put('/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;
    const { scriptData } = req.body;

    await db('o_script')
      .where('id', scriptId)
      .update({
        content: JSON.stringify(scriptData),
        updateTime: Date.now()
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 删除剧本
router.delete('/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;

    await db('o_script').where('id', scriptId).delete();

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 生成剧本骨架（调用AI）
router.post('/:scriptId/generate', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;
    const { templateId, episodeCount, duration } = req.body;

    // 调用剧本骨架生成服务
    const skeleton = await scriptSkeletonService.generateSkeleton({
      templateId: templateId || 'custom',
      episodeCount: episodeCount || 1,
      duration: duration || '3min'
    });

    await db('o_script')
      .where('id', scriptId)
      .update({
        content: JSON.stringify(skeleton),
        updateTime: Date.now()
      });

    return res.json(success(skeleton));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
