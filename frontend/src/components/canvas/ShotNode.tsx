import React, { useState } from 'react';
import { NodeProps } from './Node';
import { Camera, Play, Trash2, Loader } from 'lucide-react';
import { storyboardApi, agentApi } from '../../services/api';

export const ShotNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const shotData = node.shotData;

  const handleGenerateShot = async () => {
    if (!node.storyboardId) {
      alert('请先创建分镜');
      return;
    }

    setLoading(true);
    try {
      // 调用生产Agent生成分镜
      const result = await agentApi.generateStoryboard(node.projectId!, node.scriptId!);
      console.log('Agent生成分镜结果:', result);
      
      // 更新节点数据
      if (result.shots && result.shots.length > 0) {
        onUpdate(node.id, {
          shotData: result.shots[0]
        });
        alert('分镜生成成功！');
      } else {
        alert('未生成分镜数据');
      }
    } catch (error: any) {
      console.error('生成分镜失败:', error);
      alert(`生成失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="canvas-node-content">
      <div className="node-header">
        <Camera className="node-icon" size={20} />
        <span className="node-title">分镜节点</span>
      </div>

      <div className="node-body">
        {shotData && (
          <>
            <div className="shot-info">
              <div className="info-row">
                <span className="label">节拍ID:</span>
                <span className="value">{shotData.beatId}</span>
              </div>
              <div className="info-row">
                <span className="label">景别:</span>
                <span className="value">{shotData.shotSize}</span>
              </div>
              <div className="info-row">
                <span className="label">镜头运动:</span>
                <span className="value">{shotData.cameraMovement}</span>
              </div>
              <div className="info-row">
                <span className="label">情绪强度:</span>
                <span className="value">{shotData.emotionIntensity}/10</span>
              </div>
              <div className="info-row">
                <span className="label">续接模式:</span>
                <span className="value">{shotData.continuityMode}</span>
              </div>
            </div>

            <div className="shot-action">
              <span className="label">动作描述:</span>
              <p className="description">{shotData.action}</p>
            </div>

            {shotData.characters.length > 0 && (
              <div className="shot-characters">
                <span className="label">出场角色:</span>
                <div className="character-tags">
                  {shotData.characters.map((char, idx) => (
                    <span key={idx} className="char-tag">{char}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="node-actions">
              <button className="action-btn primary" onClick={handleGenerateShot}>
                <Play size={16} />
                <span>生成分镜</span>
              </button>

              <button className="action-btn danger" onClick={() => onDelete(node.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .shot-info {
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

        .shot-action {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .shot-action .label {
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

        .shot-characters {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .shot-characters .label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .character-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .char-tag {
          padding: 2px 8px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 3px;
          font-size: 11px;
          color: #60a5fa;
        }
      `}</style>
    </div>
  );
};
