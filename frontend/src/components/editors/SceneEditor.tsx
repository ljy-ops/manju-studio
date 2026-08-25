import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { sceneApi } from '../../services/api';

interface SceneEditorProps {
  assetId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ assetId, isOpen, onClose, onUpdate }) => {
  const [sceneData, setSceneData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && assetId) {
      loadScene();
    }
  }, [isOpen, assetId]);

  const loadScene = async () => {
    setLoading(true);
    try {
      const data = await sceneApi.get(assetId);
      setSceneData(data.sceneData);
    } catch (error: any) {
      console.error('加载场景失败:', error);
      alert(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await sceneApi.update(assetId, sceneData);
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
          <h2 className="text-xl font-bold text-white">场景编辑器</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">加载中...</div>
        ) : sceneData ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  场景名称
                </label>
                <input
                  type="text"
                  value={sceneData.name || ''}
                  onChange={(e) => setSceneData({ ...sceneData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  场景标签
                </label>
                <input
                  type="text"
                  value={sceneData.tag || ''}
                  onChange={(e) => setSceneData({ ...sceneData, tag: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  GEO布局
                </label>
                <textarea
                  value={sceneData.geoLayout || ''}
                  onChange={(e) => setSceneData({ ...sceneData, geoLayout: e.target.value })}
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm"
                  placeholder="定义场景的空间布局..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  光线描述
                </label>
                <textarea
                  value={sceneData.lighting || ''}
                  onChange={(e) => setSceneData({ ...sceneData, lighting: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  placeholder="描述场景的光线效果..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  视角数量 ({sceneData.views?.length || 0})
                </label>
                <div className="bg-gray-800 rounded p-4">
                  {sceneData.views?.map((view: any, idx: number) => (
                    <div key={idx} className="mb-2 last:mb-0 text-sm text-gray-300">
                      视角 {idx + 1}: {view.name || '未命名'}
                    </div>
                  ))}
                </div>
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
          <div className="text-center text-gray-400">无法加载场景数据</div>
        )}
      </div>
    </div>
  );
};
