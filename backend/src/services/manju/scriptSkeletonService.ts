/**
 * 剧本骨架生成服务
 * 基于模板生成剧本结构
 */

import { db } from '../../lib/db';

export interface ScriptSkeletonParams {
  templateId: string;
  episodeCount: number;
  duration: string;
}

export interface ScriptSkeletonResult {
  episodes: Array<{
    episodeId: string;
    duration: string;
    acts: Array<{
      actId: string;
      actType: string;
      scenes: Array<{
        sceneId: string;
        beats: Array<{
          beatId: string;
          duration: string;
          conflict: string;
          emotionIntensity: number;
          rhythmMarkers: string[];
        }>;
      }>;
    }>;
  }>;
  totalBeats: number;
  templateId: string;
}

// 剧本模板定义
const SCRIPT_TEMPLATES: Record<string, any> = {
  rebirth: {
    name: '重生逆袭',
    structure: {
      acts: [
        { type: '起', scenes: 2, beatsPerScene: 3 },
        { type: '承', scenes: 3, beatsPerScene: 3 },
        { type: '转', scenes: 2, beatsPerScene: 4 },
        { type: '合', scenes: 2, beatsPerScene: 3 }
      ]
    }
  },
  romance: {
    name: '甜宠',
    structure: {
      acts: [
        { type: '起', scenes: 2, beatsPerScene: 3 },
        { type: '承', scenes: 3, beatsPerScene: 3 },
        { type: '转', scenes: 2, beatsPerScene: 3 },
        { type: '合', scenes: 2, beatsPerScene: 3 }
      ]
    }
  },
  suspense: {
    name: '悬疑复仇',
    structure: {
      acts: [
        { type: '起', scenes: 2, beatsPerScene: 4 },
        { type: '承', scenes: 3, beatsPerScene: 3 },
        { type: '转', scenes: 2, beatsPerScene: 4 },
        { type: '合', scenes: 2, beatsPerScene: 3 }
      ]
    }
  },
  comedy: {
    name: '沙雕',
    structure: {
      acts: [
        { type: '起', scenes: 2, beatsPerScene: 3 },
        { type: '承', scenes: 3, beatsPerScene: 3 },
        { type: '转', scenes: 2, beatsPerScene: 3 },
        { type: '合', scenes: 2, beatsPerScene: 3 }
      ]
    }
  },
  custom: {
    name: '自定义',
    structure: {
      acts: [
        { type: '起', scenes: 2, beatsPerScene: 3 },
        { type: '承', scenes: 2, beatsPerScene: 3 },
        { type: '转', scenes: 2, beatsPerScene: 3 },
        { type: '合', scenes: 2, beatsPerScene: 3 }
      ]
    }
  }
};

class ScriptSkeletonService {
  /**
   * 生成剧本骨架
   */
  async generateSkeleton(params: ScriptSkeletonParams): Promise<ScriptSkeletonResult> {
    const { templateId, episodeCount, duration } = params;
    const template = SCRIPT_TEMPLATES[templateId] || SCRIPT_TEMPLATES.custom;

    const episodes = [];
    let totalBeats = 0;

    for (let ep = 1; ep <= episodeCount; ep++) {
      const episodeId = `ep${ep}`;
      const acts = [];

      for (let actIdx = 0; actIdx < template.structure.acts.length; actIdx++) {
        const actConfig = template.structure.acts[actIdx];
        const actId = `${episodeId}_act${actIdx + 1}`;
        const scenes = [];

        for (let sc = 1; sc <= actConfig.scenes; sc++) {
          const sceneId = `${actId}_sc${sc}`;
          const beats = [];

          for (let b = 1; b <= actConfig.beatsPerScene; b++) {
            const beatId = `${sceneId}_b${b}`;
            beats.push({
              beatId,
              duration: '3s',
              conflict: '人vs自我',
              emotionIntensity: 5,
              rhythmMarkers: b === 1 && sc === 1 && actIdx === 0 ? ['冷启动钩子'] : []
            });
            totalBeats++;
          }

          scenes.push({ sceneId, beats });
        }

        acts.push({
          actId,
          actType: actConfig.type,
          scenes
        });
      }

      episodes.push({
        episodeId,
        duration,
        acts
      });
    }

    return {
      episodes,
      totalBeats,
      templateId
    };
  }

  /**
   * 获取模板列表
   */
  getTemplates() {
    return Object.entries(SCRIPT_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      structure: template.structure
    }));
  }
}

export const scriptSkeletonService = new ScriptSkeletonService();
