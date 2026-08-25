/**
 * 提示词生成服务
 * 根据分镜数据生成 Krea2、MiniMax H3、Qwen Edit 提示词
 */

import { db } from '../../lib/db';

export interface PromptGenerateParams {
  shotData: any;
  styleGuide?: any;
  characterData?: any;
  sceneData?: any;
}

export interface PromptGenerateResult {
  krea2Prompt: string;
  minimaxH3Prompt: string;
  qwenEditPrompt: string;
  forbiddenWords: string[];
  version: number;
}

// 禁用词库
const FORBIDDEN_WORDS = [
  '血腥', '暴力', '色情', '政治', '歧视',
  '血腥', '暴力', '色情', '裸露', '毒品'
];

class PromptFactoryService {
  /**
   * 生成单个分镜的提示词
   */
  async generatePrompt(params: PromptGenerateParams): Promise<PromptGenerateResult> {
    const { shotData, styleGuide, characterData, sceneData } = params;

    // 生成 Krea2 提示词（6要素结构）
    const krea2Prompt = this.generateKrea2Prompt(shotData, styleGuide, characterData, sceneData);

    // 生成 MiniMax H3 提示词（三段式结构）
    const minimaxH3Prompt = this.generateMinimaxH3Prompt(shotData, sceneData);

    // 生成 Qwen Edit 提示词（如果有编辑需求）
    const qwenEditPrompt = this.generateQwenEditPrompt(shotData);

    // 检查禁用词
    const forbiddenWords = this.checkForbiddenWords(krea2Prompt, minimaxH3Prompt, qwenEditPrompt);

    return {
      krea2Prompt,
      minimaxH3Prompt,
      qwenEditPrompt,
      forbiddenWords,
      version: 1
    };
  }

  /**
   * 批量生成提示词
   */
  async batchGeneratePrompts(projectId: number, scriptId: number): Promise<{
    taskId: string;
    totalShots: number;
  }> {
    // 获取所有分镜
    const shots = await db('o_storyboard')
      .where('projectId', projectId)
      .where('scriptId', scriptId)
      .orderBy('index', 'asc');

    // 这里应该异步处理，返回任务ID
    // 实际实现中应该使用任务队列
    const taskId = `batch_prompt_${Date.now()}`;

    // 异步处理每个分镜
    for (const shot of shots) {
      const shotData = JSON.parse(shot.videoDesc || '{}');
      
      // 获取关联的角色和场景数据
      const characterData = shotData.characters?.[0] 
        ? await this.getCharacterData(shotData.characters[0])
        : null;
      
      const sceneData = shotData.location
        ? await this.getSceneData(shotData.location)
        : null;

      // 生成提示词
      const promptResult = await this.generatePrompt({
        shotData,
        characterData,
        sceneData
      });

      // 更新分镜的提示词数据
      shotData.promptData = promptResult;
      await db('o_storyboard')
        .where('id', shot.id)
        .update({
          videoDesc: JSON.stringify(shotData),
          prompt: promptResult.krea2Prompt
        });
    }

    return {
      taskId,
      totalShots: shots.length
    };
  }

  /**
   * 生成 Krea2 提示词
   */
  private generateKrea2Prompt(
    shotData: any,
    styleGuide?: any,
    characterData?: any,
    sceneData?: any
  ): string {
    const parts = [];

    // 1. 风格锚定词
    if (styleGuide?.anchorWords) {
      parts.push(styleGuide.anchorWords);
    }

    // 2. 主体+动作
    if (shotData.action) {
      parts.push(shotData.action);
    }

    // 3. 角色外貌
    if (characterData?.appearance) {
      parts.push(characterData.appearance);
    }

    // 4. 场景布局
    if (sceneData?.geoLayout) {
      parts.push(sceneData.geoLayout);
    }

    // 5. 景别和镜头
    if (shotData.shotSize) {
      parts.push(`${shotData.shotSize} shot`);
    }
    if (shotData.cameraMovement) {
      parts.push(`camera: ${shotData.cameraMovement}`);
    }

    // 6. 情绪强度
    if (shotData.emotionIntensity) {
      const moodMap: Record<number, string> = {
        1: 'calm, peaceful',
        3: 'neutral',
        5: 'moderate tension',
        7: 'intense',
        9: 'extreme, dramatic'
      };
      const mood = moodMap[Math.ceil(shotData.emotionIntensity / 2) * 2 - 1] || 'neutral';
      parts.push(mood);
    }

    return parts.join(', ');
  }

  /**
   * 生成 MiniMax H3 提示词
   */
  private generateMinimaxH3Prompt(shotData: any, sceneData?: any): string {
    const parts = [];

    // 场景描述
    if (sceneData?.name) {
      parts.push(`[场景] ${sceneData.name}`);
    }

    // 镜头运动
    if (shotData.cameraMovement) {
      parts.push(`[镜头运动] ${shotData.cameraMovement}`);
    }

    // 音频描述
    if (shotData.dialogue) {
      parts.push(`[音频] ${shotData.dialogue}`);
    } else {
      parts.push('[音频] 无对白');
    }

    return parts.join('\n');
  }

  /**
   * 生成 Qwen Edit 提示词
   */
  private generateQwenEditPrompt(shotData: any): string {
    // 如果有编辑指令，生成 Qwen Edit 提示词
    if (shotData.editInstructions) {
      return shotData.editInstructions;
    }
    return '';
  }

  /**
   * 检查禁用词
   */
  private checkForbiddenWords(...texts: string[]): string[] {
    const combinedText = texts.join(' ');
    const detected = FORBIDDEN_WORDS.filter(word => combinedText.includes(word));
    return [...new Set(detected)]; // 去重
  }

  /**
   * 获取角色数据
   */
  private async getCharacterData(tag: string): Promise<any> {
    const character = await db('o_assets')
      .where('type', 'role')
      .where('describe', 'like', `%${tag}%`)
      .first();
    
    if (character) {
      return JSON.parse(character.describe || '{}');
    }
    return null;
  }

  /**
   * 获取场景数据
   */
  private async getSceneData(tag: string): Promise<any> {
    const scene = await db('o_assets')
      .where('type', 'scene')
      .where('describe', 'like', `%${tag}%`)
      .first();
    
    if (scene) {
      return JSON.parse(scene.describe || '{}');
    }
    return null;
  }
}

export const promptFactoryService = new PromptFactoryService();
