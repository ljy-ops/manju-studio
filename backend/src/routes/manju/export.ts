import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { success, error } from '../../utils/response';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 导出项目JSON
router.get('/project/:projectId/json', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // 获取项目基本信息
    const project = await db('o_project')
      .where('id', projectId)
      .first();

    if (!project) {
      return res.json(error('项目不存在'));
    }

    // 获取剧本
    const scripts = await db('o_script')
      .where('projectId', projectId);

    // 获取资产（角色、场景、道具）
    const assets = await db('o_assets')
      .where('projectId', projectId);

    // 获取分镜
    const storyboards = await db('o_storyboard')
      .where('projectId', projectId)
      .orderBy('index', 'asc');

    // 获取流程状态
    const processStages = await db('o_process')
      .where('projectId', projectId)
      .orderBy('stageOrder', 'asc');

    // 组装导出数据
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        artStyle: project.artStyle,
        videoRatio: project.videoRatio
      },
      scripts: scripts.map(s => ({
        id: s.id,
        name: s.name,
        content: JSON.parse(s.content || '{}')
      })),
      characters: assets
        .filter(a => a.type === 'role')
        .map(a => ({
          id: a.id,
          characterData: JSON.parse(a.describe || '{}')
        })),
      scenes: assets
        .filter(a => a.type === 'scene')
        .map(a => ({
          id: a.id,
          sceneData: JSON.parse(a.describe || '{}')
        })),
      props: assets
        .filter(a => a.type === 'tool')
        .map(a => ({
          id: a.id,
          propData: JSON.parse(a.describe || '{}')
        })),
      storyboards: storyboards.map(s => ({
        id: s.id,
        index: s.index,
        shotData: JSON.parse(s.videoDesc || '{}'),
        prompt: s.prompt,
        duration: s.duration,
        state: s.state
      })),
      processStages: processStages.map(p => ({
        stageId: p.stageId,
        status: p.status,
        progress: p.progress,
        completedAt: p.completedAt
      }))
    };

    return res.json(success(exportData));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 导出提示词包
router.get('/project/:projectId/prompts', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const storyboards = await db('o_storyboard')
      .where('projectId', projectId)
      .orderBy('index', 'asc');

    const promptPackage = storyboards.map(shot => {
      const shotData = JSON.parse(shot.videoDesc || '{}');
      return {
        shotId: shot.id,
        index: shot.index,
        krea2Prompt: shot.prompt,
        minimaxH3Prompt: shotData.promptData?.minimaxH3Prompt || '',
        qwenEditPrompt: shotData.promptData?.qwenEditPrompt || ''
      };
    });

    return res.json(success(promptPackage));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 导出ComfyUI工作流
router.get('/project/:projectId/comfyui-workflow', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const storyboards = await db('o_storyboard')
      .where('projectId', projectId)
      .orderBy('index', 'asc');

    // 生成ComfyUI工作流JSON
    const workflow = {
      last_node_id: storyboards.length * 3,
      last_link_id: storyboards.length * 2,
      nodes: [],
      links: [],
      groups: [],
      config: {},
      extra: {},
      version: 0.4
    };

    let nodeId = 1;
    let linkId = 1;

    storyboards.forEach((shot, index) => {
      const shotData = JSON.parse(shot.videoDesc || '{}');
      
      // 添加Krea2生图节点
      workflow.nodes.push({
        id: nodeId++,
        type: 'Krea2TextToImage',
        pos: [index * 400, 0],
        size: { width: 300, height: 200 },
        inputs: [
          { name: 'prompt', type: 'string', value: shot.prompt }
        ],
        outputs: [
          { name: 'image', type: 'IMAGE', links: [linkId] }
        ],
        properties: {}
      });

      // 添加Qwen Edit节点（如果有编辑指令）
      if (shotData.promptData?.qwenEditPrompt) {
        workflow.nodes.push({
          id: nodeId++,
          type: 'QwenImageEdit',
          pos: [index * 400, 300],
          size: { width: 300, height: 200 },
          inputs: [
            { name: 'image', type: 'IMAGE', link: linkId - 1 },
            { name: 'instruction', type: 'string', value: shotData.promptData.qwenEditPrompt }
          ],
          outputs: [
            { name: 'image', type: 'IMAGE', links: [linkId + 1] }
          ],
          properties: {}
        });
      }

      // 添加MiniMax H3视频生成节点
      workflow.nodes.push({
        id: nodeId++,
        type: 'MiniMaxH3ImageToVideo',
        pos: [index * 400, 600],
        size: { width: 300, height: 200 },
        inputs: [
          { name: 'image', type: 'IMAGE', link: linkId },
          { name: 'prompt', type: 'string', value: shotData.promptData?.minimaxH3Prompt || '' }
        ],
        outputs: [
          { name: 'video', type: 'VIDEO', links: [] }
        ],
        properties: {}
      });

      linkId += 2;
    });

    return res.json(success(workflow));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 导出剪映格式
router.get('/project/:projectId/jianying', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const storyboards = await db('o_storyboard')
      .where('projectId', projectId)
      .orderBy('index', 'asc');

    // 生成剪映时间线数据
    const timeline = {
      version: '1.0',
      tracks: [
        {
          type: 'video',
          clips: storyboards.map((shot, index) => {
            const shotData = JSON.parse(shot.videoDesc || '{}');
            const duration = parseInt(shotData.duration?.replace('s', '') || '5');
            return {
              id: `clip_${index}`,
              source: `video_${shot.id}.mp4`,
              startTime: index * duration,
              duration: duration,
              transition: index > 0 ? 'fade' : null
            };
          })
        },
        {
          type: 'audio',
          clips: storyboards.map((shot, index) => {
            const shotData = JSON.parse(shot.videoDesc || '{}');
            const duration = parseInt(shotData.duration?.replace('s', '') || '5');
            return {
              id: `audio_${index}`,
              source: shotData.dialogue ? `dialogue_${shot.id}.wav` : null,
              startTime: index * duration,
              duration: duration,
              text: shotData.dialogue || ''
            };
          }).filter(clip => clip.source)
        }
      ]
    };

    return res.json(success(timeline));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

// 导入项目JSON
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { importData } = req.body;

    if (!importData || !importData.project) {
      return res.json(error('导入数据格式错误'));
    }

    // 创建项目
    const [projectId] = await db('o_project').insert({
      name: importData.project.name,
      type: importData.project.type,
      artStyle: importData.project.artStyle,
      videoRatio: importData.project.videoRatio,
      createTime: Date.now(),
      updateTime: Date.now()
    });

    // 导入剧本
    for (const script of importData.scripts || []) {
      await db('o_script').insert({
        projectId,
        name: script.name,
        content: JSON.stringify(script.content),
        createTime: Date.now(),
        updateTime: Date.now()
      });
    }

    // 导入资产
    for (const char of importData.characters || []) {
      await db('o_assets').insert({
        projectId,
        name: char.characterData.name,
        type: 'role',
        describe: JSON.stringify(char.characterData),
        createTime: Date.now(),
        updateTime: Date.now()
      });
    }

    for (const scene of importData.scenes || []) {
      await db('o_assets').insert({
        projectId,
        name: scene.sceneData.name,
        type: 'scene',
        describe: JSON.stringify(scene.sceneData),
        createTime: Date.now(),
        updateTime: Date.now()
      });
    }

    // 导入分镜
    for (const shot of importData.storyboards || []) {
      await db('o_storyboard').insert({
        projectId,
        index: shot.index,
        prompt: shot.prompt,
        videoDesc: JSON.stringify(shot.shotData),
        duration: shot.duration,
        state: shot.state || 'idle',
        createTime: Date.now()
      });
    }

    return res.json(success({ projectId }));
  } catch (err: any) {
    return res.json(error(err.message));
  }
});

export default router;
