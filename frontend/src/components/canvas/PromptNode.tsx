import React, { useState } from 'react';
import { NodeProps } from './Node';
import { MessageSquare, Copy, Trash2, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { promptApi, agentApi } from '../../services/api';

export const PromptNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const promptData = node.promptData;

  const handleCopyPrompt = async (type: 'krea2' | 'minimax' | 'qwen') => {
    let text = '';
    if (type === 'krea2') text = promptData?.krea2Prompt || '';
    else if (type === 'minimax') text = promptData?.minimaxH3Prompt || '';
    else if (type === 'qwen') text = promptData?.qwenEditPrompt || '';
    
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!node.storyboardId) {
      alert('请先关联分镜');
      return;
    }

    try {
      // 调用后端API生成提示词
      const result = await promptApi.generate(node.storyboardId);
      
      // 更新节点数据
      onUpdate(node.id, {
        promptData: {
          krea2Prompt: result.krea2Prompt,
          minimaxH3Prompt: result.minimaxH3Prompt,
          qwenEditPrompt: result.qwenEditPrompt,
          forbiddenWords: result.forbiddenWords,
          version: 1
        }
      });
      
      alert('提示词生成成功！');
    } catch (error: any) {
      console.error('生成提示词失败:', error);
      alert(`生成失败: ${error.message}`);
    }
  };

  const handleBatchGeneratePrompts = async () => {
    if (!node.projectId || !node.scriptId) {
      alert('请先关联项目和剧本');
      return;
    }

    setBatchGenerating(true);
    try {
      // 调用生产Agent批量生成提示词
      const result = await agentApi.generatePrompts(node.projectId, node.scriptId);
      console.log('批量生成提示词结果:', result);
      
      if (result.prompts && result.prompts.length > 0) {
        // 更新节点数据
        onUpdate(node.id, {
          promptData: result.prompts[0]
        });
        alert(`成功生成 ${result.prompts.length} 个提示词！`);
      } else {
        alert('未生成提示词，请检查剧本和分镜内容');
      }
    } catch (error: any) {
      console.error('批量生成提示词失败:', error);
      alert(`生成失败: ${error.message}`);
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleCheckForbidden = async () => {
    if (!promptData) return;

    try {
      const allText = [
        promptData.krea2Prompt,
        promptData.minimaxH3Prompt,
        promptData.qwenEditPrompt
      ].join(' ');

      const result = await promptApi.checkForbidden(allText);
      
      if (result.hasForbidden) {
        alert(`检测到禁用词: ${result.detectedWords.join(', ')}`);
      } else {
        alert('未检测到禁用词');
      }
    } catch (error: any) {
      console.error('检查禁用词失败:', error);
    }
  };

  return (
    <div className="canvas-node-content">
      <div className="node-header">
        <MessageSquare className="node-icon" size={20} />
        <span className="node-title">提示词节点</span>
      </div>

      <div className="node-body">
        {promptData && (
          <>
            <div className="prompt-info">
              <div className="info-row">
                <span className="label">版本:</span>
                <span className="value">v{promptData.version}</span>
              </div>
              {promptData.forbiddenWords.length > 0 && (
                <div className="warning-row">
                  <AlertTriangle size={14} className="warning-icon" />
                  <span>检测到禁用词: {promptData.forbiddenWords.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="prompt-section">
              <div className="prompt-header">
                <span className="label">Krea2 提示词:</span>
                <button 
                  className="copy-btn"
                  onClick={() => handleCopyPrompt('krea2')}
                >
                  <Copy size={14} />
                </button>
              </div>
              <pre className="prompt-text">{promptData.krea2Prompt}</pre>
            </div>

            <div className="prompt-section">
              <div className="prompt-header">
                <span className="label">MiniMax H3 提示词:</span>
                <button 
                  className="copy-btn"
                  onClick={() => handleCopyPrompt('minimax')}
                >
                  <Copy size={14} />
                </button>
              </div>
              <pre className="prompt-text">{promptData.minimaxH3Prompt}</pre>
            </div>

            {promptData.qwenEditPrompt && (
              <div className="prompt-section">
                <div className="prompt-header">
                  <span className="label">Qwen Edit 指令:</span>
                  <button 
                    className="copy-btn"
                    onClick={() => handleCopyPrompt('qwen')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <pre className="prompt-text">{promptData.qwenEditPrompt}</pre>
              </div>
            )}

            <div className="node-actions">
              <button 
                className="action-btn primary" 
                onClick={handleGeneratePrompt}
                disabled={!node.storyboardId}
              >
                <Sparkles size={16} />
                <span>生成提示词</span>
              </button>

              <button 
                className="action-btn" 
                onClick={handleBatchGeneratePrompts}
                disabled={batchGenerating || !node.projectId || !node.scriptId}
              >
                {batchGenerating ? <Loader size={16} /> : <Sparkles size={16} />}
                <span>批量生成</span>
              </button>

              <button className="action-btn danger" onClick={() => onDelete(node.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .prompt-info {
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

        .warning-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 6px;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 3px;
          font-size: 12px;
          color: #fbbf24;
        }

        .warning-icon {
          flex-shrink: 0;
        }

        .label {
          color: #888;
        }

        .value {
          color: #fff;
          font-weight: 500;
        }

        .prompt-section {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .prompt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .prompt-header .label {
          font-size: 13px;
        }

        .copy-btn {
          padding: 4px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 3px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .prompt-text {
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
          word-break: break-word;
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
};
