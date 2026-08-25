import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';
import { storyboardDesignerService } from '../../services/manju/storyboardDesignerService';

const router = Router();

// 获取分镜列表
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId } = req.query;
    
    if (!projectId) {
      return res.json(error('缺少项目ID'));
    }

    let query = db('o_storyboard')
      .where('projectId', projectId)
      .orderBy('index', 'asc');

    if (scriptId) {
      query = query.where('scriptId', scriptId);
    }

    const shots = await query;

    const shotList = shots.map(shot => ({
      ...shot,
      shotData: JSON.parse(shot.videoDesc || '{}')
    }));

    return res.json(success(shotList));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 创建分镜
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId, index, shotData } = req.body;

    if (!projectId || !scriptId) {
      return res.json(error('缺少必要参数'));
    }

    const [storyboardId] = await db('o_storyboard').insert({
      projectId,
      scriptId,
      index: index || 0,
      prompt: shotData?.prompt || '',
      videoDesc: JSON.stringify(shotData || {}),
      duration: shotData?.duration || '5s',
      state: 'idle',
      createTime: Date.now()
    });

    return res.json(success({ storyboardId }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 获取分镜详情
router.get('/:storyboardId', async (req: Request, res: Response) => {
  try {
    const { storyboardId } = req.params;

    const shot = await db('o_storyboard')
      .where('id', storyboardId)
      .first();

    if (!shot) {
      return res.json(error('分镜不存在'));
    }

    const shotData = JSON.parse(shot.videoDesc || '{}');

    return res.json(success({
      ...shot,
      shotData
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 更新分镜
router.put('/:storyboardId', async (req: Request, res: Response) => {
  try {
    const { storyboardId } = req.params;
    const { shotData } = req.body;

    await db('o_storyboard')
      .where('id', storyboardId)
      .update({
        prompt: shotData?.prompt || '',
        videoDesc: JSON.stringify(shotData || {}),
        duration: shotData?.duration || '5s'
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 删除分镜
router.delete('/:storyboardId', async (req: Request, res: Response) => {
  try {
    const { storyboardId } = req.params;

    await db('o_storyboard').where('id', storyboardId).delete();

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 批量生成分镜
router.post('/batchGenerate', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId } = req.body;

    // 调用分镜生成服务
    const result = await storyboardDesignerService.generateStoryboard({
      projectId,
      scriptId
    });

    return res.json(success(result));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 设置分镜续接模式
router.post('/:storyboardId/continuity', async (req: Request, res: Response) => {
  try {
    const { storyboardId } = req.params;
    const { continuityMode, previousShotId } = req.body;

    const shot = await db('o_storyboard')
      .where('id', storyboardId)
      .first();

    if (!shot) {
      return res.json(error('分镜不存在'));
    }

    const shotData = JSON.parse(shot.videoDesc || '{}');
    shotData.continuityMode = continuityMode;
    shotData.previousShotId = previousShotId;

    await db('o_storyboard')
      .where('id', storyboardId)
      .update({
        videoDesc: JSON.stringify(shotData)
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
