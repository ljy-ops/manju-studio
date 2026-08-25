import express from 'express';
import { z } from 'zod';
import u from '@/utils';
import { success, error } from '@/lib/responseFormat';
import { validateFields } from '@/middleware/middleware';

const router = express.Router();

// ============================================================================
// 15阶段定义
// ============================================================================

const PROCESS_STAGES = [
  { id: '1', name: '选题确认', group: 'pre', description: '确定故事概念和题材方向' },
  { id: '2a', name: '剧本骨架生成', group: 'script', description: '生成集/幕/场景/节拍层次结构' },
  { id: '2b', name: '节奏编排', group: 'script', description: '标注情绪曲线和关键节奏点' },
  { id: '2c', name: '角色弧光设计', group: 'script', description: '定义角色成长轨迹' },
  { id: '2d', name: '节拍级表演定义', group: 'script', description: '填充6要素表演块' },
  { id: '2e', name: '剧本诊断', group: 'script', description: '自动检测剧本质量问题' },
  { id: '3', name: '画风锁定', group: 'style', description: '确定项目视觉风格' },
  { id: '4', name: '角色资产', group: 'asset', description: '创建角色节点（含多形象+活人感）' },
  { id: '5', name: '场景资产', group: 'asset', description: '创建场景节点（含720度视角）' },
  { id: '6', name: '道具资产', group: 'asset', description: '创建关键道具节点' },
  { id: '7', name: '分镜设计', group: 'storyboard', description: '生成分镜节点序列' },
  { id: '8', name: '对白管理', group: 'storyboard', description: '标注对白情绪和音频提示词' },
  { id: '9', name: '提示词生成', group: 'prompt', description: '生成Krea2/H3/QwenEdit提示词' },
  { id: '10', name: '智能分镜预览', group: 'preview', description: '批量预览并确认分镜图' },
  { id: '11', name: '生图执行', group: 'generation', description: 'Krea2生图，素材回嵌画布' },
  { id: '12', name: '图片编辑', group: 'generation', description: 'Qwen Edit编辑，素材回嵌' },
  { id: '13', name: '画质增强', group: 'generation', description: 'SUPIR放大，素材回嵌' },
  { id: '14', name: '生视频', group: 'generation', description: 'MiniMax H3生视频，素材回嵌' },
  { id: '15', name: '导出', group: 'export', description: '导出项目（JSON/提示词包/剪映格式）' },
];

// ============================================================================
// GET /api/process/stages - 获取阶段定义
// ============================================================================
router.get('/stages', async (req, res) => {
  try {
    res.status(200).send(success({ stages: PROCESS_STAGES }));
  } catch (err: any) {
    res.status(500).send(error(err.message));
  }
});

// ============================================================================
// GET /api/process/:projectId - 获取项目流程状态
// ============================================================================
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // 从数据库获取流程状态
    const processRecords = await u.db('o_process')
      .where('projectId', Number(projectId))
      .orderBy('stageOrder', 'asc');

    // 构建完整的阶段状态
    const stageStatus = PROCESS_STAGES.map(stage => {
      const record = processRecords.find((r: any) => r.stageId === stage.id);
      return {
        ...stage,
        status: record?.status || 'pending',
        completedAt: record?.completedAt || null,
        nextAction: record?.nextAction || null,
        progress: record?.progress || 0,
        metadata: record?.metadata ? JSON.parse(record.metadata) : null,
      };
    });

    // 计算总体进度
    const completedCount = stageStatus.filter(s => s.status === 'completed').length;
    const totalProgress = Math.round((completedCount / PROCESS_STAGES.length) * 100);

    // 找到当前阶段（第一个非completed的阶段）
    const currentStage = stageStatus.find(s => s.status !== 'completed');

    res.status(200).send(success({
      projectId: Number(projectId),
      stages: stageStatus,
      totalProgress,
      currentStage: currentStage?.id || null,
      currentStageName: currentStage?.name || '已完成',
    }));
  } catch (err: any) {
    res.status(500).send(error(err.message));
  }
});

// ============================================================================
// POST /api/process/:projectId/update - 更新阶段状态
// ============================================================================
router.post(
  '/:projectId/update',
  validateFields({
    stageId: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed']),
    progress: z.number().min(0).max(100).optional(),
    nextAction: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { stageId, status, progress, nextAction, metadata } = req.body;

      // 找到阶段顺序
      const stageIndex = PROCESS_STAGES.findIndex(s => s.id === stageId);
      if (stageIndex === -1) {
        return res.status(400).send(error(`无效的阶段ID: ${stageId}`));
      }

      // 检查是否已有记录
      const existing = await u.db('o_process')
        .where('projectId', Number(projectId))
        .where('stageId', stageId)
        .first();

      const now = Date.now();

      if (existing) {
        // 更新
        await u.db('o_process')
          .where('id', existing.id)
          .update({
            status,
            progress: progress ?? existing.progress,
            nextAction: nextAction ?? null,
            metadata: metadata ? JSON.stringify(metadata) : null,
            completedAt: status === 'completed' ? now : null,
            updateTime: now,
          });
      } else {
        // 新增
        await u.db('o_process').insert({
          projectId: Number(projectId),
          stageId,
          stageOrder: stageIndex,
          status,
          progress: progress || 0,
          nextAction: nextAction || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          completedAt: status === 'completed' ? now : null,
          createTime: now,
          updateTime: now,
        });
      }

      res.status(200).send(success({ message: '阶段状态已更新' }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);

// ============================================================================
// POST /api/process/:projectId/batch-update - 批量更新阶段状态
// ============================================================================
router.post(
  '/:projectId/batch-update',
  validateFields({
    updates: z.array(z.object({
      stageId: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      progress: z.number().min(0).max(100).optional(),
    })),
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { updates } = req.body;
      const now = Date.now();

      for (const update of updates) {
        const stageIndex = PROCESS_STAGES.findIndex(s => s.id === update.stageId);
        if (stageIndex === -1) continue;

        const existing = await u.db('o_process')
          .where('projectId', Number(projectId))
          .where('stageId', update.stageId)
          .first();

        if (existing) {
          await u.db('o_process')
            .where('id', existing.id)
            .update({
              status: update.status,
              progress: update.progress ?? existing.progress,
              completedAt: update.status === 'completed' ? now : null,
              updateTime: now,
            });
        } else {
          await u.db('o_process').insert({
            projectId: Number(projectId),
            stageId: update.stageId,
            stageOrder: stageIndex,
            status: update.status,
            progress: update.progress || 0,
            completedAt: update.status === 'completed' ? now : null,
            createTime: now,
            updateTime: now,
          });
        }
      }

      res.status(200).send(success({ message: `已更新 ${updates.length} 个阶段` }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);

// ============================================================================
// GET /api/process/:projectId/next-action - 获取下一步操作建议
// ============================================================================
router.get('/:projectId/next-action', async (req, res) => {
  try {
    const { projectId } = req.params;

    const processRecords = await u.db('o_process')
      .where('projectId', Number(projectId))
      .orderBy('stageOrder', 'asc');

    // 找到当前阶段
    const currentStageIndex = PROCESS_STAGES.findIndex(stage => {
      const record = processRecords.find((r: any) => r.stageId === stage.id);
      return !record || record.status !== 'completed';
    });

    if (currentStageIndex === -1) {
      return res.status(200).send(success({
        message: '所有阶段已完成！',
        nextStage: null,
        suggestion: '可以导出项目或开始新的项目',
      }));
    }

    const currentStage = PROCESS_STAGES[currentStageIndex];
    const record = processRecords.find((r: any) => r.stageId === currentStage.id);

    // 根据阶段生成具体建议
    const suggestions = generateSuggestions(currentStage.id, record);

    res.status(200).send(success({
      currentStage: currentStage.id,
      currentStageName: currentStage.name,
      description: currentStage.description,
      suggestion: record?.nextAction || suggestions.default,
      tips: suggestions.tips,
    }));
  } catch (err: any) {
    res.status(500).send(error(err.message));
  }
});

// 生成阶段建议
function generateSuggestions(stageId: string, record: any) {
  const suggestionMap: Record<string, { default: string; tips: string[] }> = {
    '1': {
      default: '选择一个故事概念，或让AI生成热门题材推荐',
      tips: ['可以参考当前热门题材：重生逆袭、甜宠、悬疑复仇', '好的选题是成功的一半'],
    },
    '2a': {
      default: '使用剧本骨架生成器，从选题创建集/幕/场景/节拍结构',
      tips: ['选择一个模板类型（重生/甜宠/悬疑/沙雕）', '建议先做1集3分钟的试水'],
    },
    '2b': {
      default: '在节奏编辑器中标注情绪曲线和关键节奏点',
      tips: ['确保冷启动钩子情绪强度≥7', '每幕至少1个转折点'],
    },
    '2c': {
      default: '为主要角色设计弧光轨迹',
      tips: ['每个主要角色至少1个转折点', '弧光类型：逆袭/堕落/觉醒/扁平'],
    },
    '2d': {
      default: '为每个节拍填充6要素表演块',
      tips: ['利用智能填充从角色弧光自动读取', '每个节拍必须有冲突定义'],
    },
    '2e': {
      default: '运行剧本诊断器检查质量问题',
      tips: ['确保无🔴级问题', '关注节奏太平和角色消失问题'],
    },
    '3': {
      default: '选择项目视觉风格（日漫/国风/写实/半写实/赛博朋克）',
      tips: ['风格锚定词会自动注入所有提示词', '可以上传参考图作为Style Reference'],
    },
    '4': {
      default: '为每个角色创建资产节点，包含三格表提示词和活人感档案',
      tips: ['角色表必须包含无头全身正面（防偷脸）', '定义活人感：眨眼模式/手部习惯/情绪肌肉映射'],
    },
    '5': {
      default: '为每个场景创建资产节点，包含GEO空间布局和光线逻辑',
      tips: ['GEO布局必须是纯空间地图，不含角色和动作', '一景一光原则'],
    },
    '6': {
      default: '创建关键道具资产节点',
      tips: ['只创建对剧情有推动作用的道具', '每个道具需要参考图提示词'],
    },
    '7': {
      default: '从剧本+资产生成分镜节点序列',
      tips: ['第一秒必须是全景无对白', '每镜头粘贴完整GEO布局块'],
    },
    '8': {
      default: '为每个分镜标注对白情绪和音频提示词',
      tips: ['无对白镜头自动注入沉默条款', '音频提示词会注入H3的[Audio]块'],
    },
    '9': {
      default: '批量生成Krea2/H3/QwenEdit提示词',
      tips: ['生成前自动进行禁用词检查', '约束校验：H3时长4-15秒，参考图≤9'],
    },
    '10': {
      default: '批量生成分镜预览图，确认构图逻辑',
      tips: ['先确认构图再花算力生成高质量图', '在故事板上标注问题后调整提示词'],
    },
    '11': {
      default: '将确认的提示词发送到ComfyUI执行Krea2生图',
      tips: ['生成结果回嵌到画布对应分镜节点', '可以对每个分镜生成多个版本'],
    },
    '12': {
      default: '对生图结果执行Qwen Edit编辑流水线',
      tips: ['面部微调→背景替换→局部重绘', '每步可独立开关'],
    },
    '13': {
      default: '使用SUPIR将图片放大到4K-8K',
      tips: ['放大后的图片作为H3的高质量首帧', '需要16GB+显存'],
    },
    '14': {
      default: '将增强后的图片发送到MiniMax H3生成视频',
      tips: ['支持T2V/FLF2V/R2V三种模式', '运镜通过提示词控制'],
    },
    '15': {
      default: '导出完整项目数据',
      tips: ['支持JSON/提示词包/剪映格式导出', '可以备份整个项目用于恢复'],
    },
  };

  return suggestionMap[stageId] || {
    default: '继续当前阶段的工作',
    tips: [],
  };
}

export default router;
