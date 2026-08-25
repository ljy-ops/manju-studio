import React, { useState } from 'react';
import { NodeProps } from './Node';
import { Wand2, Play, Trash2, CheckCircle, Loader } from 'lucide-react';
import { comfyuiApi } from '../../services/api';

export const EditNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const editData = node.editData;

  const handleRunEdit = async () => {
    if (!editData || editData.steps.length === 0) {
      alert('请先配置编辑步骤');
      return;
    }

    setLoading(true);
    
    try {
      // 按顺序执行每个启用的编辑步骤
      for (let i = 0; i < editData.steps.length; i++) {
        const step = editData.steps[i];
        if (!step.enabled) continue;

        // 更新当前步骤
        onUpdate(node.id, {
          editData: {
            ...editData,
            currentStep: i
          }
        });

        // 根据步骤类型选择对应的工作流
        let workflowId = '';
        switch (step.stepType) {
          case 'face_adjust':
            workflowId = 'qwen_edit';
            break;
          case 'background_replace':
            workflowId = 'qwen_edit';
            break;
          case 'local_inpaint':
            workflowId = 'qwen_edit';
            break;
          case 'upscale':
            workflowId = 'supir_upscale';
            break;
        }

        // 提交ComfyUI任务
        const result = await comfyuiApi.submit(workflowId, {
          instruction: step.instruction,
          maskDescription: step.maskDescription,
          referenceImage: step.referenceImage
        });

        // 等待任务完成
        let taskStatus = 'running';
        while (taskStatus === 'running') {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const task = await comfyuiApi.getTask(result.taskId);
          taskStatus = task.status;

          if (taskStatus === 'completed') {
            const taskResult = await comfyuiApi.getResult(result.taskId);
            step.outputImage = taskResult.image;
          } else if (taskStatus === 'failed') {
            throw new Error(`步骤 ${i + 1} 执行失败: ${task.error}`);
          }
        }
      }

      // 所有步骤完成
      onUpdate(node.id, {
        editData: {
          ...editData,
          currentStep: editData.steps.length - 1
        }
      });

      alert('编辑流水线执行完成！');
    } catch (error: any) {
      console.error('执行编辑失败:', error);
      alert(`执行失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = {
    face_adjust: '面部微调',
    background_replace: '背景替换',
    local_inpaint: '局部重绘',
    upscale: '画质增强'
  };

  return (
    <div className="canvas-node-content">
      <div className="node-header">
        <Wand2 className="node-icon" size={20} />
        <span className="node-title">编辑指令节点</span>
      </div>

      <div className="node-body">
        {editData && (
          <>
            <div className="edit-info">
              <div className="info-row">
                <span className="label">当前步骤:</span>
                <span className="value">{editData.currentStep + 1} / {editData.steps.length}</span>
              </div>
            </div>

            <div className="edit-steps">
              <span className="label">编辑流水线:</span>
              <div className="steps-list">
                {editData.steps.map((step, idx) => (
                  <div key={idx} className={`step-item ${step.enabled ? 'enabled' : 'disabled'}`}>
                    <div className="step-header">
                      <CheckCircle size={14} className="step-icon" />
                      <span className="step-label">
                        Step {idx + 1}: {stepLabels[step.stepType as keyof typeof stepLabels] || step.stepType}
                      </span>
                    </div>
                    {step.enabled && step.instruction && (
                      <p className="step-instruction">{step.instruction}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="node-actions">
              <button className="action-btn primary" onClick={handleRunEdit}>
                <Play size={16} />
                <span>执行编辑</span>
              </button>

              <button className="action-btn danger" onClick={() => onDelete(node.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .edit-info {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .label {
          color: #888;
        }

        .value {
          color: #fff;
          font-weight: 500;
        }

        .edit-steps {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .edit-steps .label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .step-item {
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          border-left: 3px solid #666;
        }

        .step-item.enabled {
          border-left-color: #3b82f6;
        }

        .step-item.disabled {
          opacity: 0.5;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .step-icon {
          color: #3b82f6;
        }

        .step-label {
          font-size: 12px;
          color: #fff;
          font-weight: 500;
        }

        .step-instruction {
          margin: 0;
          padding-left: 20px;
          font-size: 11px;
          color: #aaa;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
