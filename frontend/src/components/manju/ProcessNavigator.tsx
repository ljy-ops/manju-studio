import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader, AlertCircle } from 'lucide-react';
import { processApi } from '../../services/api';

interface Stage {
  id: string;
  name: string;
  group: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: number | null;
  nextAction: string | null;
  progress: number;
  metadata: any;
}

interface ProcessNavigatorProps {
  projectId: number;
  onStageClick?: (stageId: string) => void;
}

const STAGE_GROUPS = [
  { id: 'pre', name: '前期', color: 'bg-purple-500' },
  { id: 'script', name: '剧本', color: 'bg-blue-500' },
  { id: 'style', name: '风格', color: 'bg-indigo-500' },
  { id: 'asset', name: '资产', color: 'bg-cyan-500' },
  { id: 'storyboard', name: '分镜', color: 'bg-teal-500' },
  { id: 'prompt', name: '提示词', color: 'bg-green-500' },
  { id: 'preview', name: '预览', color: 'bg-yellow-500' },
  { id: 'generation', name: '生成', color: 'bg-orange-500' },
  { id: 'export', name: '导出', color: 'bg-red-500' },
];

export const ProcessNavigator: React.FC<ProcessNavigatorProps> = ({ projectId, onStageClick }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetchProcessStatus();
  }, [projectId]);

  const fetchProcessStatus = async () => {
    try {
      const data = await processApi.getStatus(projectId);
      setStages(data.stages);
      setTotalProgress(data.totalProgress);
      setCurrentStage(data.currentStage);
    } catch (error) {
      console.error('Failed to fetch process status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStageStatus = async (stageId: string, status: 'pending' | 'in_progress' | 'completed', progress?: number) => {
    try {
      await processApi.update(projectId, stageId, status, progress);
      await fetchProcessStatus();
    } catch (error) {
      console.error('Failed to update stage status:', error);
    }
  };

  const getStageIcon = (stage: Stage) => {
    if (stage.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (stage.status === 'in_progress') {
      return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  const getGroupColor = (groupId: string) => {
    return STAGE_GROUPS.find(g => g.id === groupId)?.color || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-center">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-400">加载流程状态...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border-b border-gray-700">
      {/* 进度条 */}
      <div className="px-4 py-2 border-b border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-400">总体进度</span>
          <span className="text-sm font-medium text-white">{totalProgress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* 阶段列表 */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              {/* 阶段节点 */}
              <div
                className="relative group cursor-pointer"
                onClick={() => onStageClick?.(stage.id)}
                onMouseEnter={() => setShowTooltip(stage.id)}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <div className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                  ${stage.status === 'completed' 
                    ? 'bg-green-900/20 border-green-700 hover:bg-green-900/30' 
                    : stage.status === 'in_progress'
                    ? 'bg-blue-900/20 border-blue-700 hover:bg-blue-900/30'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}
                `}>
                  {getStageIcon(stage)}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getGroupColor(stage.group)}`} />
                      <span className="text-xs text-gray-400">
                        {STAGE_GROUPS.find(g => g.id === stage.group)?.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white whitespace-nowrap">
                      {stage.name}
                    </span>
                  </div>
                  {stage.progress > 0 && stage.status === 'in_progress' && (
                    <span className="text-xs text-blue-400 ml-2">{stage.progress}%</span>
                  )}
                </div>

                {/* 工具提示 */}
                {showTooltip === stage.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                    <div className="text-sm font-medium text-white mb-1">{stage.name}</div>
                    <div className="text-xs text-gray-400 mb-2">{stage.description}</div>
                    {stage.nextAction && (
                      <div className="text-xs text-blue-400 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{stage.nextAction}</span>
                      </div>
                    )}
                    {stage.completedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        完成于: {new Date(stage.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 连接线 */}
              {index < stages.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  stage.status === 'completed' ? 'bg-green-700' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
