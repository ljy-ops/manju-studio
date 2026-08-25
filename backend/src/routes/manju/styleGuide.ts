import { Router, Request, Response } from 'express';
import { success, error } from '../../utils/response';
import { styleGuideService } from '../../services/manju/styleGuideService';

const router = Router();

// 获取画风列表
router.get('/presets', async (req: Request, res: Response) => {
  try {
    const presets = styleGuideService.getPresets();
    return res.json(success(presets));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 获取画风详情
router.get('/:styleId', async (req: Request, res: Response) => {
  try {
    const { styleId } = req.params;
    const styleDetail = await styleGuideService.getStyleDetail(styleId);
    return res.json(success(styleDetail));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 应用画风到项目
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { projectId, styleId } = req.body;

    if (!projectId || !styleId) {
      return res.json(error('缺少必要参数'));
    }

    await styleGuideService.applyStyle(projectId, styleId);

    return res.json(success({
      message: '画风已应用',
      styleId
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 上传画风参考图
router.post('/upload-reference', async (req: Request, res: Response) => {
  try {
    const { styleId, imageUrl } = req.body;

    if (!styleId || !imageUrl) {
      return res.json(error('缺少必要参数'));
    }

    await styleGuideService.saveReferenceImage(styleId, imageUrl);

    return res.json(success({
      message: '参考图已上传',
      imageUrl
    }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
