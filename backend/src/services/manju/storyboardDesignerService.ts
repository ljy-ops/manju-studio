/**
 * 分镜生成服务
 * 根据剧本数据自动生成分镜
 */

import { db } from '../../lib/db';

export interface StoryboardGenerateParams {
  projectId: number;
  scriptId: number;
}

export interface StoryboardGenerateResult {
  message: string;
  shots: Array<{
    beatId: string;
    shotSize: string;
    cameraMovement: string;
    characters: string[];
    characterPositions: string;
    action: string;
    emotionIntensity: number;
    continuityMode: string;
  }>;
}

class StoryboardDesignerService {
  /**
   * 根据剧本生成分镜
   */
  async generateStoryboard(params: StoryboardGenerateParams): Promise<StoryboardGenerateResult> {
    const { projectId, scriptId } = params;

    // 获取剧本数据
    const script = await db('o_script')
      .where('id', scriptId)
      .first();

    if (!script) {
      throw new Error('剧本不存在');
    }

    const scriptData = JSON.parse(script.content || '{}');
    const shots = [];

    // 遍历剧本的所有节拍，生成分镜
    for (const episode of scriptData.episodes || []) {
      for (const act of episode.acts || []) {
        for (const scene of act.scenes || []) {
          for (const beat of scene.beats || []) {
            // 根据节拍数据生成分镜
            const shot = this.generateShotFromBeat(beat, scene);
            shots.push(shot);

            // 插入数据库
            await db('o_storyboard').insert({
              projectId,
              scriptId,
              index: shots.length - 1,
              prompt: '',
              videoDesc: JSON.stringify(shot),
              duration: beat.duration || '5s',
              state: 'idle',
              createTime: Date.now()
            });
          }
        }
      }
    }

    return {
      message: `成功生成 ${shots.length} 个分镜`,
      shots
    };
  }

  /**
   * 根据节拍生成分镜
   */
  private generateShotFromBeat(beat: any, scene: any): any {
    // 根据情绪强度决定景别
    const shotSize = this.getShotSizeByEmotion(beat.emotionIntensity);

    // 根据冲突类型决定镜头运动
    const cameraMovement = this.getCameraMovementByConflict(beat.conflict);

    // 生成默认动作描述
    const action = this.generateActionDescription(beat);

    return {
      beatId: beat.beatId,
      shotSize,
      cameraMovement,
      characters: [], // 需要从剧本中提取
      characterPositions: '画面中央',
      action,
      emotionIntensity: beat.emotionIntensity || 5,
      continuityMode: 'independent'
    };
  }

  /**
   * 根据情绪强度决定景别
   */
  private getShotSizeByEmotion(intensity: number): string {
    if (intensity >= 8) return '特写';
    if (intensity >= 6) return '近景';
    if (intensity >= 4) return '中景';
    if (intensity >= 2) return '全景';
    return '远景';
  }

  /**
   * 根据冲突类型决定镜头运动
   */
  private getCameraMovementByConflict(conflict: string): string {
    switch (conflict) {
      case '人vs人':
        return '推拉';
      case '人vs环境':
        return '摇移';
      case '人vs自我':
        return '固定';
      default:
        return '固定';
    }
  }

  /**
   * 生成动作描述
   */
  private generateActionDescription(beat: any): string {
    // 这里可以调用 AI 生成更详细的动作描述
    // 暂时返回简单的描述
    const emotionMap: Record<number, string> = {
      1: '角色平静地站立',
      3: '角色缓慢移动',
      5: '角色做出一般动作',
      7: '角色做出激烈动作',
      9: '角色做出极端动作'
    };
    
    const intensity = beat.emotionIntensity || 5;
    const baseAction = emotionMap[Math.ceil(intensity / 2) * 2 - 1] || '角色做出动作';
    
    if (beat.rhythmMarkers?.includes('冷启动钩子')) {
      return `${baseAction}，吸引观众注意`;
    }
    
    return baseAction;
  }
}

export const storyboardDesignerService = new StoryboardDesignerService();
