// API服务层 - 统一管理所有后端API调用

const API_BASE_URL = 'http://localhost:10588/api';

// 通用请求方法
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }

  return data.data;
}

// 剧本管理API
export const scriptApi = {
  // 获取剧本列表
  list: (projectId: number) => 
    request<any[]>(`/manju/script/list?projectId=${projectId}`),
  
  // 创建剧本
  create: (projectId: number, title: string, templateId?: string) =>
    request<{ scriptId: number }>('/manju/script/create', {
      method: 'POST',
      body: JSON.stringify({ projectId, title, templateId }),
    }),
  
  // 获取剧本详情
  get: (scriptId: number) =>
    request<any>(`/manju/script/${scriptId}`),
  
  // 更新剧本
  update: (scriptId: number, scriptData: any) =>
    request<void>(`/manju/script/${scriptId}`, {
      method: 'PUT',
      body: JSON.stringify({ scriptData }),
    }),
  
  // 删除剧本
  delete: (scriptId: number) =>
    request<void>(`/manju/script/${scriptId}`, {
      method: 'DELETE',
    }),
  
  // 生成剧本骨架
  generate: (scriptId: number, templateId: string, episodeCount?: number, duration?: string) =>
    request<any>(`/manju/script/${scriptId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ templateId, episodeCount, duration }),
    }),
};

// 角色管理API
export const characterApi = {
  // 获取角色列表
  list: (projectId: number) =>
    request<any[]>(`/manju/character/list?projectId=${projectId}`),
  
  // 创建角色
  create: (projectId: number, name: string, tag: string, appearance: string, forms?: any[]) =>
    request<{ assetId: number }>('/manju/character/create', {
      method: 'POST',
      body: JSON.stringify({ projectId, name, tag, appearance, forms }),
    }),
  
  // 获取角色详情
  get: (assetId: number) =>
    request<any>(`/manju/character/${assetId}`),
  
  // 更新角色
  update: (assetId: number, characterData: any) =>
    request<void>(`/manju/character/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify({ characterData }),
    }),
  
  // 删除角色
  delete: (assetId: number) =>
    request<void>(`/manju/character/${assetId}`, {
      method: 'DELETE',
    }),
  
  // 生成表情变体
  generateExpressions: (assetId: number) =>
    request<{ message: string; taskId: string }>(`/manju/character/${assetId}/generateExpressions`, {
      method: 'POST',
    }),
  
  // 设置角色弧光
  setArc: (assetId: number, arcType: string, startState: any, endState: any, turningPoints?: any[]) =>
    request<void>(`/manju/character/${assetId}/arc`, {
      method: 'POST',
      body: JSON.stringify({ arcType, startState, endState, turningPoints }),
    }),
};

// 场景管理API
export const sceneApi = {
  // 获取场景列表
  list: (projectId: number) =>
    request<any[]>(`/manju/scene/list?projectId=${projectId}`),
  
  // 创建场景
  create: (projectId: number, name: string, tag: string, geoLayout: string, lighting: string) =>
    request<{ assetId: number }>('/manju/scene/create', {
      method: 'POST',
      body: JSON.stringify({ projectId, name, tag, geoLayout, lighting }),
    }),
  
  // 获取场景详情
  get: (assetId: number) =>
    request<any>(`/manju/scene/${assetId}`),
  
  // 更新场景
  update: (assetId: number, sceneData: any) =>
    request<void>(`/manju/scene/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify({ sceneData }),
    }),
  
  // 删除场景
  delete: (assetId: number) =>
    request<void>(`/manju/scene/${assetId}`, {
      method: 'DELETE',
    }),
  
  // 添加场景视角
  addView: (assetId: number, viewName: string, referenceImage: string, geoLayout: string) =>
    request<void>(`/manju/scene/${assetId}/views`, {
      method: 'POST',
      body: JSON.stringify({ viewName, referenceImage, geoLayout }),
    }),
};

// 分镜管理API
export const storyboardApi = {
  // 获取分镜列表
  list: (projectId: number, scriptId?: number) =>
    request<any[]>(`/manju/storyboard/list?projectId=${projectId}${scriptId ? `&scriptId=${scriptId}` : ''}`),
  
  // 创建分镜
  create: (projectId: number, scriptId: number, index: number, shotData: any) =>
    request<{ storyboardId: number }>('/manju/storyboard/create', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId, index, shotData }),
    }),
  
  // 获取分镜详情
  get: (storyboardId: number) =>
    request<any>(`/manju/storyboard/${storyboardId}`),
  
  // 更新分镜
  update: (storyboardId: number, shotData: any) =>
    request<void>(`/manju/storyboard/${storyboardId}`, {
      method: 'PUT',
      body: JSON.stringify({ shotData }),
    }),
  
  // 删除分镜
  delete: (storyboardId: number) =>
    request<void>(`/manju/storyboard/${storyboardId}`, {
      method: 'DELETE',
    }),
  
  // 批量生成分镜
  batchGenerate: (projectId: number, scriptId: number) =>
    request<{ message: string; shots: any[] }>('/manju/storyboard/batchGenerate', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId }),
    }),
  
  // 设置续接模式
  setContinuity: (storyboardId: number, continuityMode: string, previousShotId?: number) =>
    request<void>(`/manju/storyboard/${storyboardId}/continuity`, {
      method: 'POST',
      body: JSON.stringify({ continuityMode, previousShotId }),
    }),
};

// 提示词生成API
export const promptApi = {
  // 生成提示词
  generate: (storyboardId: number, styleGuide?: any, characterData?: any, sceneData?: any) =>
    request<any>('/manju/prompt/generate', {
      method: 'POST',
      body: JSON.stringify({ storyboardId, styleGuide, characterData, sceneData }),
    }),
  
  // 批量生成提示词
  batchGenerate: (projectId: number, scriptId: number) =>
    request<{ message: string; taskId: string }>('/manju/prompt/batchGenerate', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId }),
    }),
  
  // 更新提示词
  update: (storyboardId: number, promptData: any) =>
    request<void>('/manju/prompt/update', {
      method: 'POST',
      body: JSON.stringify({ storyboardId, promptData }),
    }),
  
  // 检查禁用词
  checkForbidden: (text: string) =>
    request<{ hasForbidden: boolean; detectedWords: string[] }>('/manju/prompt/checkForbidden', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

// ComfyUI API
export const comfyuiApi = {
  // 提交任务
  submit: (workflowId: string, parameters: any) =>
    request<{ taskId: string; message: string }>('/comfyui/submit', {
      method: 'POST',
      body: JSON.stringify({ workflowId, parameters }),
    }),
  
  // 查询任务状态
  getTask: (taskId: string) =>
    request<any>(`/comfyui/task/${taskId}`),
  
  // 获取任务结果
  getResult: (taskId: string) =>
    request<any>(`/comfyui/task/${taskId}/result`),
  
  // 取消任务
  cancel: (taskId: string) =>
    request<{ message: string }>(`/comfyui/task/${taskId}/cancel`, {
      method: 'POST',
    }),
  
  // 获取工作流列表
  getWorkflows: () =>
    request<any[]>('/comfyui/workflows'),
  
  // 检查连接状态
  getStatus: () =>
    request<{ connected: boolean; systemStats?: any }>('/comfyui/status'),
};

// 流程导航API
export const processApi = {
  // 获取阶段定义
  getStages: () =>
    request<any[]>('/process/stages'),
  
  // 获取项目流程状态
  getStatus: (projectId: number) =>
    request<any>(`/process/${projectId}`),
  
  // 更新阶段状态
  update: (projectId: number, stageId: string, status: string, progress?: number, nextAction?: string, metadata?: any) =>
    request<{ message: string }>(`/process/${projectId}/update`, {
      method: 'POST',
      body: JSON.stringify({ stageId, status, progress, nextAction, metadata }),
    }),
  
  // 批量更新阶段状态
  batchUpdate: (projectId: number, updates: any[]) =>
    request<{ message: string }>(`/process/${projectId}/batch-update`, {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }),
  
  // 获取下一步操作建议
  getNextAction: (projectId: number) =>
    request<any>(`/process/${projectId}/next-action`),
};

// 画风管理API
export const styleGuideApi = {
  // 获取画风预设
  getPresets: () =>
    request<any[]>('/manju/styleGuide/presets'),
  
  // 获取画风详情
  get: (styleId: string) =>
    request<any>(`/manju/styleGuide/${styleId}`),
  
  // 应用画风到项目
  apply: (projectId: number, styleId: string, anchorWords?: string, colorPalette?: any, negativeStyle?: string) =>
    request<{ message: string; styleId: string; anchorWords?: string }>('/manju/styleGuide/apply', {
      method: 'POST',
      body: JSON.stringify({ projectId, styleId, anchorWords, colorPalette, negativeStyle }),
    }),
  
  // 上传画风参考图
  uploadReference: (styleId: string, imageUrl: string) =>
    request<{ message: string; imageUrl: string }>('/manju/styleGuide/upload-reference', {
      method: 'POST',
      body: JSON.stringify({ styleId, imageUrl }),
    }),
};

// 导出服务API
export const exportApi = {
  // 导出项目JSON
  exportJson: (projectId: number) =>
    request<any>(`/manju/export/project/${projectId}/json`),
  
  // 导出提示词包
  exportPrompts: (projectId: number) =>
    request<any>(`/manju/export/project/${projectId}/prompts`),
  
  // 导出ComfyUI工作流
  exportComfyUI: (projectId: number) =>
    request<any>(`/manju/export/project/${projectId}/comfyui-workflow`),
  
  // 导出剪映时间线
  exportJianying: (projectId: number) =>
    request<any>(`/manju/export/project/${projectId}/jianying`),
  
  // 导入项目JSON
  import: (importData: any) =>
    request<{ projectId: number }>('/manju/export/import', {
      method: 'POST',
      body: JSON.stringify({ importData }),
    }),
};

// AI Agent API
export const agentApi = {
  // 剧本Agent - 生成剧本骨架
  generateScript: (projectId: number, scriptId: number, concept: string, genre: string, episodes: number, durationPerEpisode: string) =>
    request<any>('/manju/agent/script/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId, concept, genre, episodes, durationPerEpisode }),
    }),
  
  // 剧本Agent - 提取角色
  extractCharacters: (projectId: number, scriptId: number) =>
    request<any>('/manju/agent/script/extract-characters', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId }),
    }),
  
  // 生产Agent - 生成分镜
  generateStoryboard: (projectId: number, scriptId: number) =>
    request<any>('/manju/agent/production/generate-storyboard', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId }),
    }),
  
  // 生产Agent - 生成资产
  generateAssets: (projectId: number, scriptId: number) =>
    request<any>('/manju/agent/production/generate-assets', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId }),
    }),
  
  // 生产Agent - 生成提示词
  generatePrompts: (projectId: number, scriptId: number) =>
    request<any>('/manju/agent/production/generate-prompts', {
      method: 'POST',
      body: JSON.stringify({ projectId, scriptId }),
    }),
};
