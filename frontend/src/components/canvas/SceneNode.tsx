import React, { useState } from 'react';
import { NodeProps } from './Node';
import { MapPin, Edit2, Trash2, Eye, Loader } from 'lucide-react';
import { sceneApi } from '../../services/api';
import { SceneEditor } from '../editors/SceneEditor';

export const SceneNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const sceneData = node.sceneData;

  const handleEditScene = () => {
    setEditorOpen(true);
  };

  const handlePreviewViews = async () => {
    if (!node.assetId) {
      alert('请先创建场景');
      return;
    }

    setLoading(true);
    try {
      // 获取场景详情（包含所有视角）
      const sceneDetail = await sceneApi.get(node.assetId);
      console.log('场景视角:', sceneDetail.sceneData.views);
      alert(`该场景有 ${sceneDetail.sceneData.views.length} 个视角`);
    } catch (error: any) {
      console.error('获取场景视角失败:', error);
      alert(`获取失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="canvas-node-content">
        <div className="node-header">
          <MapPin className="node-icon" size={20} />
          <span className="node-title">{sceneData?.name || '场景节点'}</span>
        </div>

        <div className="node-body">
          {sceneData && (
            <>
              <div className="scene-info">
                <div className="info-row">
                  <span className="label">标签:</span>
                  <span className="value">{sceneData.tag}</span>
                </div>
                <div className="info-row">
                  <span className="label">视角数:</span>
                  <span className="value">{sceneData.views.length}</span>
                </div>
                <div className="info-row">
                  <span className="label">光线:</span>
                  <span className="value">{sceneData.lighting}</span>
                </div>
              </div>

              <div className="scene-geo">
                <span className="label">GEO布局:</span>
                <pre className="geo-layout">{sceneData.geoLayout}</pre>
              </div>

              <div className="node-actions">
                <button className="action-btn" onClick={handleEditScene}>
                  <Edit2 size={16} />
                  <span>编辑</span>
                </button>

                <button className="action-btn" onClick={handlePreviewViews}>
                  <Eye size={16} />
                  <span>预览视角</span>
                </button>

                <button className="action-btn danger" onClick={() => onDelete(node.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          .scene-info {
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

          .scene-geo {
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }

          .scene-geo .label {
            display: block;
            margin-bottom: 4px;
            font-size: 13px;
          }

          .geo-layout {
            color: #ccc;
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 6px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 3px;
            max-height: 80px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
          }
        `}</style>
      </div>

      {node.assetId && (
        <SceneEditor
          assetId={node.assetId}
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onUpdate={() => {
            // 重新加载场景数据
            sceneApi.get(node.assetId!).then(data => {
              onUpdate(node.id, { sceneData: data.sceneData });
            });
          }}
        />
      )}
    </>
  );
};
