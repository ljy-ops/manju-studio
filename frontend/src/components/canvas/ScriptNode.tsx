import React, { useState } from 'react';
import { NodeProps } from './Node';
import { FileText, Play, Edit2, Trash2, Loader, Sparkles } from 'lucide-react';
import { scriptApi, agentApi } from '../../services/api';
import { ScriptEditor } from '../editors/ScriptEditor';

export const ScriptNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const scriptData = node.scriptData || { episodes: [], totalBeats: 0 };

  const handleGenerateScript = async () => {
    if (!node.scriptId || !node.projectId) {
      alert('请先创建剧本和项目');
      return;
    }

    setLoading(true);
    try {
      // 调用AI Agent生成剧本骨架
      const result = await agentApi.generateScript(
        node.projectId,
        node.scriptId,
        '一个关于成长的故事', // 默认概念，可从节点配置获取
        'rebirth', // 默认类型
        1, // 默认集数
        '3min' // 默认时长
      );
      
      // 更新节点数据
      onUpdate(node.id, {
        scriptData: {
          ...scriptData,
          episodes: result.episodes,
          totalBeats: result.totalBeats,
        }
      });
      
      alert('剧本骨架生成成功！');
    } catch (error: any) {
      console.error('生成剧本失败:', error);
      alert(`生成失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractCharacters = async () => {
    if (!node.scriptId || !node.projectId) {
      alert('请先创建剧本和项目');
      return;
    }

    setLoading(true);
    try {
      // 调用AI Agent提取角色
      const result = await agentApi.extractCharacters(node.projectId, node.scriptId);
      
      console.log('提取的角色:', result.characters);
      alert(`成功提取 ${result.characters.length} 个角色！`);
    } catch (error: any) {
      console.error('提取角色失败:', error);
      alert(`提取失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditScript = () => {
    setEditorOpen(true);
  };

  return (
    <>
      <div className="canvas-node-content">
        <div className="node-header">
          <FileText className="node-icon" size={20} />
          <span className="node-title">剧本节点</span>
        </div>

        <div className="node-body">
          <div className="script-info">
            <div className="info-row">
              <span className="label">集数:</span>
              <span className="value">{scriptData.episodes.length}</span>
            </div>
            <div className="info-row">
              <span className="label">总节拍:</span>
              <span className="value">{scriptData.totalBeats}</span>
            </div>
            {scriptData.templateId && (
              <div className="info-row">
                <span className="label">模板:</span>
                <span className="value">{scriptData.templateId}</span>
              </div>
            )}
          </div>

          <div className="node-actions">
            <button
              className="action-btn primary"
              onClick={handleGenerateScript}
              disabled={loading || scriptData.episodes.length > 0}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
              <span>生成剧本</span>
            </button>

            {scriptData.episodes.length > 0 && (
              <>
                <button className="action-btn" onClick={handleExtractCharacters} disabled={loading}>
                  <Sparkles size={16} />
                  <span>提取角色</span>
                </button>

                <button className="action-btn" onClick={handleEditScript}>
                  <Edit2 size={16} />
                  <span>编辑</span>
                </button>
              </>
            )}

            <button className="action-btn danger" onClick={() => onDelete(node.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <style jsx>{`
          .script-info {
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

          .animate-spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>

      {node.scriptId && (
        <ScriptEditor
          scriptId={node.scriptId}
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onUpdate={() => {
            // 重新加载剧本数据
            scriptApi.get(node.scriptId!).then(data => {
              onUpdate(node.id, { scriptData: data.scriptData });
            });
          }}
        />
      )}
    </>
  );
};
