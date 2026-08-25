import React, { useState } from 'react';
import { Download, FileJson, FileVideo, FileText, Package } from 'lucide-react';
import { exportApi } from '../../services/api';

interface ExportPanelProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ projectId, isOpen, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<string>('');

  const handleExport = async (type: string) => {
    setExporting(true);
    setExportType(type);

    try {
      let data;
      let filename = '';

      switch (type) {
        case 'json':
          data = await exportApi.exportJson(projectId);
          filename = `project_${projectId}.json`;
          break;
        case 'prompts':
          data = await exportApi.exportPrompts(projectId);
          filename = `prompts_${projectId}.json`;
          break;
        case 'comfyui':
          data = await exportApi.exportComfyUI(projectId);
          filename = `comfyui_workflow_${projectId}.json`;
          break;
        case 'jianying':
          data = await exportApi.exportJianying(projectId);
          filename = `jianying_timeline_${projectId}.json`;
          break;
        default:
          return;
      }

      // 下载文件
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`导出失败: ${error.message}`);
    } finally {
      setExporting(false);
      setExportType('');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        const result = await exportApi.import(importData);
        alert(`项目导入成功！项目ID: ${result.projectId}`);
        onClose();
        // 刷新页面或重新加载项目
        window.location.reload();
      } catch (error: any) {
        console.error('Import error:', error);
        alert(`导入失败: ${error.message}`);
      }
    };

    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">导出与集成</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 导出选项 */}
          <div className="border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">导出项目</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileJson className="text-blue-400" size={24} />
                <div className="text-left">
                  <div className="text-white font-medium">完整项目 JSON</div>
                  <div className="text-sm text-gray-400">包含所有数据</div>
                </div>
                {exporting && exportType === 'json' && (
                  <div className="ml-auto animate-spin">⏳</div>
                )}
              </button>

              <button
                onClick={() => handleExport('prompts')}
                disabled={exporting}
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileText className="text-green-400" size={24} />
                <div className="text-left">
                  <div className="text-white font-medium">提示词包</div>
                  <div className="text-sm text-gray-400">所有分镜提示词</div>
                </div>
                {exporting && exportType === 'prompts' && (
                  <div className="ml-auto animate-spin">⏳</div>
                )}
              </button>

              <button
                onClick={() => handleExport('comfyui')}
                disabled={exporting}
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Package className="text-purple-400" size={24} />
                <div className="text-left">
                  <div className="text-white font-medium">ComfyUI 工作流</div>
                  <div className="text-sm text-gray-400">可直接导入使用</div>
                </div>
                {exporting && exportType === 'comfyui' && (
                  <div className="ml-auto animate-spin">⏳</div>
                )}
              </button>

              <button
                onClick={() => handleExport('jianying')}
                disabled={exporting}
                className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileVideo className="text-orange-400" size={24} />
                <div className="text-left">
                  <div className="text-white font-medium">剪映时间线</div>
                  <div className="text-sm text-gray-400">视频剪辑格式</div>
                </div>
                {exporting && exportType === 'jianying' && (
                  <div className="ml-auto animate-spin">⏳</div>
                )}
              </button>
            </div>
          </div>

          {/* 导入选项 */}
          <div className="border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">导入项目</h3>
            
            <button
              onClick={handleImport}
              disabled={exporting}
              className="w-full flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="text-white" size={24} />
              <div className="text-left">
                <div className="text-white font-medium">从 JSON 文件导入</div>
                <div className="text-sm text-blue-200">恢复之前导出的项目</div>
              </div>
            </button>
          </div>

          {/* 说明信息 */}
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <h3 className="text-sm font-semibold text-white mb-2">导出格式说明</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• <strong className="text-blue-400">完整项目 JSON</strong>：包含剧本、角色、场景、分镜等所有数据，可用于备份或迁移</li>
              <li>• <strong className="text-green-400">提示词包</strong>：仅包含所有分镜的提示词，便于批量处理</li>
              <li>• <strong className="text-purple-400">ComfyUI 工作流</strong>：生成可直接导入 ComfyUI 的工作流文件</li>
              <li>• <strong className="text-orange-400">剪映时间线</strong>：生成剪映兼容的时间线数据，用于视频剪辑</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
