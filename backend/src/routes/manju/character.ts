import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';
import { expressionService } from '../../services/manju/expressionService';

const router = Router();

// 获取角色列表
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.json(error('缺少项目ID'));
    }

    const characters = await db('o_assets')
      .where('projectId', projectId)
      .where('type', 'role')
      .orderBy('createTime', 'desc');

    const characterList = characters.map(char => ({
      ...char,
      characterData: JSON.parse(char.describe || '{}')
    }));

    return res.json(success(characterList));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 创建角色
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { projectId, name, tag, appearance, forms } = req.body;

    if (!projectId || !name || !tag) {
      return res.json(error('缺少必要参数'));
    }

    const characterData = {
      tag,
      name,
      appearance,
      forms: forms || [],
      arc: null
    };

    const [assetId] = await db('o_assets').insert({
      projectId,
      name,
      type: 'role',
      prompt: '',
      describe: JSON.stringify(characterData),
      createTime: Date.now(),
      updateTime: Date.now()
    });

    return res.json(success({ assetId }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 获取角色详情
router.get('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    const character = await db('o_assets')
      .where('id', assetId)
      .where('type', 'role')
      .first();

    if (!character) {
      return res.json(error('角色不存在'));
    }

    const characterData = JSON.parse(character.describe || '{}');

    return res.json(success({
      ...character,
      characterData
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 更新角色
router.put('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { characterData } = req.body;

    await db('o_assets')
      .where('id', assetId)
      .update({
        name: characterData.name,
        describe: JSON.stringify(characterData),
        updateTime: Date.now()
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 删除角色
router.delete('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    await db('o_assets').where('id', assetId).delete();

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 生成角色表情变体
router.post('/:assetId/generateExpressions', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    // 获取角色数据
    const character = await db('o_assets')
      .where('id', assetId)
      .where('type', 'role')
      .first();

    if (!character) {
      return res.json(error('角色不存在'));
    }

    const characterData = JSON.parse(character.describe || '{}');

    // 调用表情生成服务
    const result = await expressionService.generateExpressions({
      characterTag: characterData.tag,
      appearance: characterData.appearance
    });

    return res.json(success(result));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 设置角色弧光
router.post('/:assetId/arc', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { arcType, startState, endState, turningPoints } = req.body;

    const character = await db('o_assets')
      .where('id', assetId)
      .where('type', 'role')
      .first();

    if (!character) {
      return res.json(error('角色不存在'));
    }

    const characterData = JSON.parse(character.describe || '{}');
    characterData.arc = {
      characterTag: characterData.tag,
      arcType,
      startState,
      endState,
      turningPoints: turningPoints || []
    };

    await db('o_assets')
      .where('id', assetId)
      .update({
        describe: JSON.stringify(characterData),
        updateTime: Date.now()
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
