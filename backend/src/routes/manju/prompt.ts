import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';
import { promptFactoryService } from '../../services/manju/promptFactoryService';

const router = Router();

// 生成提示词
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { storyboardId, styleGuide, characterData, sceneData } = req.body;

    if (!storyboardId) {
      return res.json(error('缺少分镜ID'));
    }

    const shot = await db('o_storyboard')
      .where('id', storyboardId)
      .first();

    if (!shot) {
      return res.json(error('分镜不存在'));
    }

    const shotData = JSON.parse(shot.videoDesc || '{}');

    // 调用提示词生成服务
    const prompts = await promptFactoryService.generatePrompt({
      shotData,
      styleGuide,
      characterData,
      sceneData
    });

    return res.json(success(prompts));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 批量生成提示词
router.post('/batchGenerate', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptId } = req.body;

    // 调用批量提示词生成服务
    const result = await promptFactoryService.batchGeneratePrompts(projectId, scriptId);

    return res.json(success(result));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 更新提示词
router.post('/update', async (req: Request, res: Response) => {
  try {
    const { storyboardId, promptData } = req.body;

    if (!storyboardId || !promptData) {
      return res.json(error('缺少必要参数'));
    }

    // 更新分镜的提示词数据
    const shot = await db('o_storyboard')
      .where('id', storyboardId)
      .first();

    if (!shot) {
      return res.json(error('分镜不存在'));
    }

    const shotData = JSON.parse(shot.videoDesc || '{}');
    shotData.promptData = promptData;

    await db('o_storyboard')
      .where('id', storyboardId)
      .update({
        videoDesc: JSON.stringify(shotData),
        prompt: promptData.krea2Prompt || shot.prompt
      });

    return res.json(success());
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 检查禁用词
router.post('/checkForbidden', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.json(error('缺少文本内容'));
    }

    // 使用提示词工厂服务的禁用词检查
    const forbiddenWords = promptFactoryService.checkForbiddenWords(text);

    return res.json(success({
      hasForbidden: forbiddenWords.length > 0,
      detectedWords: forbiddenWords
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
