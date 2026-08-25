import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { characterApi } from '../../services/api';

interface CharacterEditorProps {
  assetId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const CharacterEditor: React.FC<CharacterEditorProps> = ({ assetId, isOpen, onClose, onUpdate }) => {
  const [characterData, setCharacterData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && assetId) {
      loadCharacter();
    }
  }, [isOpen, assetId]);

  const loadCharacter = async () => {
    setLoading(true);
    try {
      const data = await characterApi.get(assetId);
      setCharacterData(data.characterData);
    } catch (error: any) {
      console.error('加载角色失败:', error);
      alert(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await characterApi.update(assetId, characterData);
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
          <h2 className="text-xl font-bold text-white">角色编辑器</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">加载中...</div>
        ) : characterData ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  角色名称
                </label>
                <input
                  type="text"
                  value={characterData.name || ''}
                  onChange={(e) => setCharacterData({ ...characterData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  角色标签
                </label>
                <input
                  type="text"
                  value={characterData.tag || ''}
                  onChange={(e) => setCharacterData({ ...characterData, tag: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  外貌描述
                </label>
                <textarea
                  value={characterData.appearance || ''}
                  onChange={(e) => setCharacterData({ ...characterData, appearance: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  形象数量 ({characterData.forms?.length || 0})
                </label>
                <div className="bg-gray-800 rounded p-4">
                  {characterData.forms?.map((form: any, idx: number) => (
                    <div key={idx} className="mb-2 last:mb-0 text-sm text-gray-300">
                      形象 {idx + 1}: {form.name || '未命名'}
                    </div>
                  ))}
                </div>
              </div>

              {characterData.arc && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    角色弧光
                  </label>
                  <div className="bg-gray-800 rounded p-4 text-sm">
                    <div className="text-gray-300">类型: {characterData.arc.arcType}</div>
                    <div className="text-gray-400 mt-2">转折点: {characterData.arc.turningPoints?.length || 0} 个</div>
                  </div>
                </div>
              )}
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
          <div className="text-center text-gray-400">无法加载角色数据</div>
        )}
      </div>
    </div>
  );
};
