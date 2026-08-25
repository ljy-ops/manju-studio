/**
 * 画风管理服务
 * 管理画风预设、参考图和项目画风设置
 */

import { db } from '../../lib/db';
import fs from 'fs/promises';
import path from 'path';

export interface StylePreset {
  id: string;
  name: string;
  anchorWords: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  negativeStyle: string;
}

export interface StyleDetail extends StylePreset {
  referenceImages: string[];
  loraModels: string[];
}

// 内置画风预设
const BUILTIN_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'anime',
    name: '日漫',
    anchorWords: 'anime style, cel shading, vibrant colors, clean linework, manga aesthetic',
    colorPalette: {
      primary: '#FF6B9D',
      secondary: '#4ECDC4',
      accent: '#FFE66D'
    },
    negativeStyle: '不要写实风格，不要3D渲染'
  },
  {
    id: 'guofeng',
    name: '国风',
    anchorWords: 'Chinese ink painting style, traditional brushwork, elegant composition, misty atmosphere',
    colorPalette: {
      primary: '#8B4513',
      secondary: '#2F4F4F',
      accent: '#DAA520'
    },
    negativeStyle: '不要现代风格，不要赛博朋克'
  },
  {
    id: 'realistic',
    name: '写实',
    anchorWords: 'photorealistic, cinematic lighting, film grain, natural skin texture, detailed pores',
    colorPalette: {
      primary: '#2C3E50',
      secondary: '#E74C3C',
      accent: '#F39C12'
    },
    negativeStyle: '不要卡通化，不要过度磨皮'
  },
  {
    id: 'semi-realistic',
    name: '半写实',
    anchorWords: 'semi-realistic, stylized realism, painterly quality, cinematic atmosphere',
    colorPalette: {
      primary: '#34495E',
      secondary: '#9B59B6',
      accent: '#1ABC9C'
    },
    negativeStyle: '不要完全卡通，不要过度写实'
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    anchorWords: 'cyberpunk style, neon lights, futuristic cityscape, high tech low life, holographic elements',
    colorPalette: {
      primary: '#FF00FF',
      secondary: '#00FFFF',
      accent: '#FFFF00'
    },
    negativeStyle: '不要自然风格，不要古代场景'
  }
];

class StyleGuideService {
  /**
   * 获取所有画风预设
   */
  getPresets(): StylePreset[] {
    return BUILTIN_STYLE_PRESETS;
  }

  /**
   * 获取画风详情
   */
  async getStyleDetail(styleId: string): Promise<StyleDetail> {
    const preset = BUILTIN_STYLE_PRESETS.find(p => p.id === styleId);
    
    if (!preset) {
      throw new Error('画风不存在');
    }

    // 从数据库或文件系统获取参考图和 LoRA 模型
    const referenceImages = await this.getReferenceImages(styleId);
    const loraModels = await this.getLoraModels(styleId);

    return {
      ...preset,
      referenceImages,
      loraModels
    };
  }

  /**
   * 应用画风到项目
   */
  async applyStyle(projectId: number, styleId: string): Promise<void> {
    const preset = BUILTIN_STYLE_PRESETS.find(p => p.id === styleId);
    
    if (!preset) {
      throw new Error('画风不存在');
    }

    // 更新项目的画风设置
    await db('o_project')
      .where('id', projectId)
      .update({
        artStyle: styleId,
        updateTime: Date.now()
      });
  }

  /**
   * 保存参考图
   */
  async saveReferenceImage(styleId: string, imageUrl: string): Promise<void> {
    // 创建画风目录
    const styleDir = path.join(process.cwd(), 'data', 'styles', styleId);
    await fs.mkdir(styleDir, { recursive: true });

    // 保存参考图路径到数据库或文件系统
    // 这里简化处理，实际应该下载图片并保存
    const referenceFile = path.join(styleDir, 'references.json');
    
    let references: string[] = [];
    try {
      const content = await fs.readFile(referenceFile, 'utf-8');
      references = JSON.parse(content);
    } catch (e) {
      // 文件不存在，使用空数组
    }

    references.push(imageUrl);
    await fs.writeFile(referenceFile, JSON.stringify(references, null, 2));
  }

  /**
   * 获取参考图列表
   */
  private async getReferenceImages(styleId: string): Promise<string[]> {
    const referenceFile = path.join(process.cwd(), 'data', 'styles', styleId, 'references.json');
    
    try {
      const content = await fs.readFile(referenceFile, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }

  /**
   * 获取 LoRA 模型列表
   */
  private async getLoraModels(styleId: string): Promise<string[]> {
    // 这里可以从 ComfyUI 或数据库获取 LoRA 模型列表
    // 暂时返回空数组
    return [];
  }
}

export const styleGuideService = new StyleGuideService();
