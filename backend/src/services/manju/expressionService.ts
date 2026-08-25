/**
 * 表情生成服务
 * 调用 ComfyUI ExpressionEditor 工作流生成角色表情变体
 */

import { comfyuiService } from './comfyui';

export interface ExpressionGenerateParams {
  characterTag: string;
  appearance: string;
  expressions?: string[];
}

export interface ExpressionGenerateResult {
  taskId: string;
  expressions: Array<{
    name: string;
    status: 'pending' | 'completed' | 'failed';
    imageUrl?: string;
  }>;
}

const DEFAULT_EXPRESSIONS = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'surprised',
  'fearful'
];

class ExpressionService {
  /**
   * 生成角色表情变体
   */
  async generateExpressions(params: ExpressionGenerateParams): Promise<ExpressionGenerateResult> {
    const { characterTag, appearance, expressions = DEFAULT_EXPRESSIONS } = params;

    // 提交 ComfyUI 任务
    const taskId = await comfyuiService.submitTask({
      workflowId: 'expression_generator',
      parameters: {
        characterTag,
        appearance,
        expressions,
        style: 'anime' // 默认风格，可从项目配置读取
      }
    });

    // 返回任务信息
    return {
      taskId,
      expressions: expressions.map(name => ({
        name,
        status: 'pending' as const
      }))
    };
  }

  /**
   * 查询表情生成状态
   */
  async getExpressionStatus(taskId: string): Promise<ExpressionGenerateResult> {
    const taskStatus = await comfyuiService.getTaskStatus(taskId);
    
    return {
      taskId,
      expressions: taskStatus.outputs?.expressions || []
    };
  }
}

export const expressionService = new ExpressionService();
