import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';

const router = Router();

// 获取场景列表
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.json(error('缺少项目ID'));
    }

    const scenes = await db('o_assets')
      .where('projectId', projectId)
      .where('type', 'scene')
      .orderBy('createTime', 'desc');

    const sceneList = scenes.map(scene => ({
      ...scene,
      sceneData: JSON.parse(scene.describe || '{}')
    }));

    return res.json(success(sceneList));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 创建场景
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { projectId, name, tag, geoLayout, lighting } = req.body;

    if (!projectId || !name || !tag) {
      return res.json(error('缺少必要参数'));
    }

    const sceneData = {
      tag,
      name,
      geoLayout: geoLayout || '',
      lighting: lighting || '',
      views: []
    };

    const [assetId] = await db('o_assets').insert({
      projectId,
      name,
      type: 'scene',
      prompt: '',
      describe: JSON.stringify(sceneData),
      createTime: Date.now(),
      updateTime: Date.now()
    });

    return res.json(success({ assetId }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 获取场景详情
router.get('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    const scene = await db('o_assets')
      .where('id', assetId)
      .where('type', 'scene')
      .first();

    if (!scene) {
      return res.json(error('场景不存在'));
    }

    const sceneData = JSON.parse(scene.describe || '{}');

    return res.json(success({
      ...scene,
      sceneData
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 更新场景
router.put('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { sceneData } = req.body;

    await db('o_assets')
      .where('id', assetId)
      .update({
        name: sceneData.name,
        describe: JSON.stringify(sceneData),
        updateTime: Date.now()
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 删除场景
router.delete('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    await db('o_assets').where('id', assetId).delete();

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 添加场景视角
router.post('/:assetId/views', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { viewName, referenceImage, geoLayout } = req.body;

    const scene = await db('o_assets')
      .where('id', assetId)
      .where('type', 'scene')
      .first();

    if (!scene) {
      return res.json(error('场景不存在'));
    }

    const sceneData = JSON.parse(scene.describe || '{}');
    sceneData.views = sceneData.views || [];
    sceneData.views.push({
      viewName,
      referenceImage,
      geoLayout
    });

    await db('o_assets')
      .where('id', assetId)
      .update({
        describe: JSON.stringify(sceneData),
        updateTime: Date.now()
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
