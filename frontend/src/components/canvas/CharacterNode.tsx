import React, { useState } from 'react';
import { NodeProps } from './Node';
import { User, Edit2, Trash2, Layers, Loader, Sparkles } from 'lucide-react';
import { characterApi, agentApi } from '../../services/api';
import { CharacterEditor } from '../editors/CharacterEditor';

export const CharacterNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const characterData = node.characterData;

  const handleEditCharacter = () => {
    setEditorOpen(true);
  };

  const handleGenerateExpressions = async () => {
    if (!node.assetId) {
      alert('请先创建角色');
      return;
    }

    setLoading(true);
    try {
      // 调用后端API生成表情变体
      const result = await characterApi.generateExpressions(node.assetId);
      console.log('表情生成任务已提交:', result.taskId);
      alert(`表情生成任务已提交，任务ID: ${result.taskId}`);
    } catch (error: any) {
      console.error('生成表情失败:', error);
      alert(`生成失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractCharacters = async () => {
    if (!node.projectId || !node.scriptId) {
      alert('请先关联项目和剧本');
      return;
    }

    setExtracting(true);
    try {
      // 调用剧本Agent提取角色
      const result = await agentApi.extractCharacters(node.projectId, node.scriptId);
      console.log('角色提取结果:', result);
      
      if (result.characters && result.characters.length > 0) {
        // 更新节点数据
        onUpdate(node.id, {
          characterData: result.characters[0]
        });
        alert(`成功提取 ${result.characters.length} 个角色！`);
      } else {
        alert('未提取到角色，请检查剧本内容');
      }
    } catch (error: any) {
      console.error('提取角色失败:', error);
      alert(`提取失败: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      <div className="canvas-node-content">
        <div className="node-header">
          <User className="node-icon" size={20} />
          <span className="node-title">{characterData?.name || '角色节点'}</span>
        </div>

        <div className="node-body">
          {characterData && (
            <>
              <div className="character-info">
                <div className="info-row">
                  <span className="label">标签:</span>
                  <span className="value">{characterData.tag}</span>
                </div>
                <div className="info-row">
                  <span className="label">形象数:</span>
                  <span className="value">{characterData.forms.length}</span>
                </div>
                {characterData.arc && (
                  <div className="info-row">
                    <span className="label">弧光:</span>
                    <span className="value">{characterData.arc.arcType}</span>
                  </div>
                )}
              </div>

              <div className="character-appearance">
                <span className="label">外貌描述:</span>
                <p className="description">{characterData.appearance}</p>
              </div>

              <div className="node-actions">
                <button className="action-btn" onClick={handleEditCharacter}>
                  <Edit2 size={16} />
                  <span>编辑</span>
                </button>

                <button 
                  className="action-btn primary" 
                  onClick={handleGenerateExpressions}
                  disabled={loading}
                >
                  <Layers size={16} />
                  <span>生成表情</span>
                </button>

                <button 
                  className="action-btn" 
                  onClick={handleExtractCharacters}
                  disabled={extracting}
                >
                  <Sparkles size={16} />
                  <span>提取角色</span>
                </button>

                <button className="action-btn danger" onClick={() => onDelete(node.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          .character-info {
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 13px;
          }

          .info-row:last-child {
            margin-bottom: 0;
          }

          .label {
            color: #888;
          }

          .value {
            color: #fff;
            font-weight: 500;
          }

          .character-appearance {
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }

          .character-appearance .label {
            display: block;
            margin-bottom: 4px;
            font-size: 13px;
          }

          .description {
            color: #ccc;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            max-height: 60px;
            overflow-y: auto;
          }
        `}</style>
      </div>

      {node.assetId && (
        <CharacterEditor
          assetId={node.assetId}
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onUpdate={() => {
            // 重新加载角色数据
            characterApi.get(node.assetId!).then(data => {
              onUpdate(node.id, { characterData: data.characterData });
            });
          }}
        />
      )}
    </>
  );
};
