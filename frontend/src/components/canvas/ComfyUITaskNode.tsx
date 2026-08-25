import React, { useState, useEffect, useRef } from 'react';
import { NodeProps } from './Node';
import { Cpu, Play, Trash2, Loader, CheckCircle, XCircle, Sparkles, Upload } from 'lucide-react';
import { comfyuiApi, agentApi } from '../../services/api';

export const ComfyUITaskNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const comfyuiData = node.comfyuiData;
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('只支持图片和视频文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // 更新节点的 comfyuiData，添加输入文件信息
      onUpdate(node.id, {
        comfyuiData: {
          ...comfyuiData,
          inputUrl: dataUrl,
          inputType: isVideo ? 'video' : 'image',
          parameters: {
            ...comfyuiData?.parameters,
            inputUrl: dataUrl
          }
        }
      });
    };
    reader.readAsDataURL(file);
  };

  // 轮询任务状态
  useEffect(() => {
    if (comfyuiData?.status === 'running' && comfyuiData?.taskId) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const task = await comfyuiApi.getTask(comfyuiData.taskId!);
          
          onUpdate(node.id, {
            comfyuiData: {
              ...comfyuiData,
              status: task.status,
              progress: task.progress,
              error: task.error
            }
          });

          // 任务完成，获取结果
          if (task.status === 'completed') {
            const result = await comfyuiApi.getResult(comfyuiData.taskId!);
            onUpdate(node.id, {
              comfyuiData: {
                ...comfyuiData,
                status: 'completed',
                progress: 1,
                resultUrl: result.image || result.video
              }
            });
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
          } else if (task.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
          }
        } catch (error) {
          console.error('轮询任务状态失败:', error);
        }
      }, 2000); // 每2秒轮询一次
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [comfyuiData?.status, comfyuiData?.taskId]);

  const handleSubmitTask = async () => {
    if (!comfyuiData?.workflowId) {
      alert('请先选择工作流');
      return;
    }

    try {
      const result = await comfyuiApi.submit(
        comfyuiData.workflowId,
        comfyuiData.parameters
      );

      onUpdate(node.id, {
        comfyuiData: {
          ...comfyuiData,
          taskId: result.taskId,
          status: 'running',
          progress: 0
        }
      });
    } catch (error: any) {
      console.error('提交任务失败:', error);
      alert(`提交任务失败: ${error.message}`);
    }
  };

  const handleCancelTask = async () => {
    if (!comfyuiData?.taskId) return;

    try {
      await comfyuiApi.cancel(comfyuiData.taskId);
      onUpdate(node.id, {
        comfyuiData: {
          ...comfyuiData,
          status: 'failed',
          error: '任务已取消'
        }
      });
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    } catch (error: any) {
      console.error('取消任务失败:', error);
      alert(`取消任务失败: ${error.message}`);
    }
  };

  const statusLabels = {
    idle: '空闲',
    running: '运行中',
    completed: '已完成',
    failed: '失败'
  };

  const statusColors = {
    idle: '#888',
    running: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444'
  };

  const handleAgentGenerateAssets = async () => {
    if (!node.projectId || !node.scriptId) {
      alert('请先关联项目和剧本');
      return;
    }

    setGenerating(true);
    try {
      const result = await agentApi.generateAssets(node.projectId, node.scriptId);
      console.log('Agent生成资产结果:', result);
      
      if (result.assets && result.assets.length > 0) {
        onUpdate(node.id, {
          comfyuiData: {
            ...comfyuiData,
            status: 'completed',
            progress: 1,
            resultUrl: result.assets[0].imageUrl
          }
        });
        alert(`成功生成 ${result.assets.length} 个资产！`);
      } else {
        alert('未生成资产，请检查剧本内容');
      }
    } catch (error: any) {
      console.error('Agent生成资产失败:', error);
      alert(`生成失败: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="canvas-node-content">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      
      <div className="node-header">
        <Cpu className="node-icon" size={20} />
        <span className="node-title">ComfyUI 任务节点</span>
      </div>

      <div className="node-body">
        {comfyuiData && (
          <>
            {comfyuiData.inputUrl && (
              <div className="input-section">
                <span className="label">输入素材:</span>
                {comfyuiData.inputType === 'video' ? (
                  <video src={comfyuiData.inputUrl} controls className="input-video" />
                ) : (
                  <img src={comfyuiData.inputUrl} alt="Input" className="input-image" />
                )}
              </div>
            )}

            <div className="task-info">
              <div className="info-row">
                <span className="label">工作流:</span>
                <span className="value">{comfyuiData.workflowId}</span>
              </div>
              <div className="info-row">
                <span className="label">状态:</span>
                <span className="value" style={{ color: statusColors[comfyuiData.status] }}>
                  {statusLabels[comfyuiData.status]}
                </span>
              </div>
              {comfyuiData.taskId && (
                <div className="info-row">
                  <span className="label">任务ID:</span>
                  <span className="value">{comfyuiData.taskId.substring(0, 8)}...</span>
                </div>
              )}
            </div>

            {comfyuiData.status === 'running' && (
              <div className="progress-section">
                <div className="progress-header">
                  <Loader size={14} className="loading-icon" />
                  <span className="progress-text">进度: {Math.round(comfyuiData.progress * 100)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${comfyuiData.progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {comfyuiData.resultUrl && (
              <div className="result-section">
                <span className="label">结果:</span>
                {comfyuiData.resultUrl.includes('video') || comfyuiData.resultUrl.includes('.mp4') ? (
                  <video src={comfyuiData.resultUrl} controls className="result-video" />
                ) : (
                  <img src={comfyuiData.resultUrl} alt="Result" className="result-image" />
                )}
              </div>
            )}

            <div className="node-actions">
              <button 
                className="action-btn" 
                onClick={() => fileInputRef.current?.click()}
                disabled={comfyuiData.status === 'running'}
              >
                <Upload size={16} />
                <span>上传素材</span>
              </button>

              <button 
                className="action-btn primary" 
                onClick={handleSubmitTask}
                disabled={comfyuiData.status === 'running'}
              >
                <Play size={16} />
                <span>提交任务</span>
              </button>

              <button 
                className="action-btn" 
                onClick={handleAgentGenerateAssets}
                disabled={generating || !node.projectId || !node.scriptId}
              >
                {generating ? <Loader size={16} /> : <Sparkles size={16} />}
                <span>Agent生成</span>
              </button>

              <button className="action-btn danger" onClick={() => onDelete(node.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .input-section {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 4px;
        }

        .input-section .label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: #888;
        }

        .input-image,
        .input-video {
          width: 100%;
          max-height: 150px;
          object-fit: contain;
          border-radius: 3px;
        }

        .task-info {
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

        .progress-section {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 4px;
        }

        .progress-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .loading-icon {
          color: #3b82f6;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .progress-text {
          font-size: 12px;
          color: #3b82f6;
          font-weight: 500;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 0.3s ease;
        }

        .result-section {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 4px;
        }

        .result-section .label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .result-image {
          width: 100%;
          max-height: 200px;
          object-fit: contain;
          border-radius: 3px;
        }

        .result-video {
          width: 100%;
          max-height: 200px;
          object-fit: contain;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};
