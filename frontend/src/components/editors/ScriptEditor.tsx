import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { scriptApi } from '../../services/api';

interface ScriptEditorProps {
  scriptId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ scriptId, isOpen, onClose, onUpdate }) => {
  const [scriptData, setScriptData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && scriptId) {
      loadScript();
    }
  }, [isOpen, scriptId]);

  const loadScript = async () => {
    setLoading(true);
    try {
      const data = await scriptApi.get(scriptId);
      setScriptData(data.scriptData);
    } catch (error: any) {
      console.error('加载剧本失败:', error);
      alert(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await scriptApi.update(scriptId, scriptData);
      alert('保存成功！');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">剧本编辑器</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">加载中...</div>
        ) : scriptData ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  集数 ({scriptData.episodes?.length || 0})
                </label>
                <div className="bg-gray-800 rounded p-4">
                  {scriptData.episodes?.map((ep: any, idx: number) => (
                    <div key={idx} className="mb-4 last:mb-0">
                      <div className="font-semibold text-white mb-2">第 {idx + 1} 集</div>
                      <div className="text-sm text-gray-400">
                        时长: {ep.duration} | 幕数: {ep.acts?.length || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  总节拍数
                </label>
                <input
                  type="number"
                  value={scriptData.totalBeats || 0}
                  onChange={(e) => setScriptData({ ...scriptData, totalBeats: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  模板ID
                </label>
                <input
                  type="text"
                  value={scriptData.templateId || ''}
                  onChange={(e) => setScriptData({ ...scriptData, templateId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400">无法加载剧本数据</div>
        )}
      </div>
    </div>
  );
};
