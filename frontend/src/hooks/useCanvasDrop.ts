/**
 * useCanvasDrop.ts
 * 
 * 画布级文件拖放 Hook
 * 支持从桌面拖拽图片/视频文件到画布空白区域，自动创建对应节点
 */

import { useCallback, useState } from 'react';
import { NodeData, NodeStatus, NodeType, Viewport } from '../types';

interface UseCanvasDropOptions {
  viewport: Viewport;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
}

interface DropFeedback {
  isActive: boolean;
  x: number;
  y: number;
}

export const useCanvasDrop = ({ viewport, setNodes, setSelectedNodeIds }: UseCanvasDropOptions) => {
  const [dropFeedback, setDropFeedback] = useState<DropFeedback>({
    isActive: false,
    x: 0,
    y: 0
  });

  /**
   * 将屏幕坐标转换为画布坐标
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.zoom,
      y: (screenY - viewport.y) / viewport.zoom
    };
  }, [viewport]);

  /**
   * 检测文件类型
   */
  const getFileCategory = (file: File): 'image' | 'video' | 'unsupported' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'unsupported';
  };

  /**
   * 处理拖进入
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否包含文件
    if (e.dataTransfer.types.includes('Files')) {
      setDropFeedback({
        isActive: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  }, []);

  /**
   * 处理拖经过
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 设置 dropEffect 以显示可放置光标
    e.dataTransfer.dropEffect = 'copy';

    if (e.dataTransfer.types.includes('Files')) {
      setDropFeedback(prev => ({
        ...prev,
        isActive: true,
        x: e.clientX,
        y: e.clientY
      }));
    }
  }, []);

  /**
   * 处理拖离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 只有离开画布区域时才隐藏反馈
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDropFeedback(prev => ({ ...prev, isActive: false }));
    }
  }, []);

  /**
   * 处理文件放置 - 核心逻辑
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropFeedback(prev => ({ ...prev, isActive: false }));

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // 过滤出支持的文件类型
    const supportedFiles = files.filter(f => 
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (supportedFiles.length === 0) {
      console.warn('[CanvasDrop] 不支持的文件类型');
      return;
    }

    // 计算放置位置的画布坐标
    const canvasPos = screenToCanvas(e.clientX, e.clientY);

    // 为每个文件创建节点
    const NODE_GAP = 400; // 多个文件时的水平间距

    supportedFiles.forEach((file, index) => {
      const category = getFileCategory(file);
      const nodeType = category === 'video' ? NodeType.VIDEO : NodeType.IMAGE;
      const nodeId = crypto.randomUUID();

      // 计算节点位置（多个文件水平排列）
      const nodeX = canvasPos.x - 170 + (index * NODE_GAP);
      const nodeY = canvasPos.y - 150;

      // 读取文件为 DataURL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        if (category === 'image') {
          // 图片节点：检测尺寸并创建
          const img = new Image();
          img.onload = () => {
            const resultAspectRatio = `${img.naturalWidth}/${img.naturalHeight}`;
            
            // 计算最接近的标准比例
            const ratio = img.naturalWidth / img.naturalHeight;
            const standardRatios = [
              { label: '1:1', value: 1 },
              { label: '16:9', value: 16 / 9 },
              { label: '9:16', value: 9 / 16 },
              { label: '4:3', value: 4 / 3 },
              { label: '3:4', value: 3 / 4 },
            ];
            let closestRatio = '16:9';
            let minDiff = Infinity;
            for (const r of standardRatios) {
              const diff = Math.abs(ratio - r.value);
              if (diff < minDiff) {
                minDiff = diff;
                closestRatio = r.label;
              }
            }

            const newNode: NodeData = {
              id: nodeId,
              type: NodeType.IMAGE,
              x: nodeX,
              y: nodeY,
              prompt: '',
              status: NodeStatus.SUCCESS,
              resultUrl: dataUrl,
              resultAspectRatio,
              aspectRatio: closestRatio,
              model: 'Uploaded',
              resolution: 'Auto',
              parentIds: [],
              title: file.name
            };

            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds([nodeId]);
          };
          img.onerror = () => {
            // 图片加载失败，仍然创建节点
            const newNode: NodeData = {
              id: nodeId,
              type: NodeType.IMAGE,
              x: nodeX,
              y: nodeY,
              prompt: '',
              status: NodeStatus.SUCCESS,
              resultUrl: dataUrl,
              aspectRatio: '16:9',
              model: 'Uploaded',
              resolution: 'Auto',
              parentIds: [],
              title: file.name
            };
            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds([nodeId]);
          };
          img.src = dataUrl;

        } else if (category === 'video') {
          // 视频节点：检测尺寸并创建
          const video = document.createElement('video');
          video.onloadedmetadata = () => {
            const resultAspectRatio = `${video.videoWidth}/${video.videoHeight}`;
            const ratio = video.videoWidth / video.videoHeight;
            const aspectRatio = ratio >= 1 ? '16:9' : '9:16';

            const newNode: NodeData = {
              id: nodeId,
              type: NodeType.VIDEO,
              x: nodeX,
              y: nodeY,
              prompt: '',
              status: NodeStatus.SUCCESS,
              resultUrl: dataUrl,
              resultAspectRatio,
              aspectRatio,
              model: 'Uploaded',
              videoModel: 'Uploaded',
              resolution: 'Auto',
              parentIds: [],
              title: file.name
            };

            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds([nodeId]);
          };
          video.onerror = () => {
            // 视频元数据加载失败，仍然创建节点
            const newNode: NodeData = {
              id: nodeId,
              type: NodeType.VIDEO,
              x: nodeX,
              y: nodeY,
              prompt: '',
              status: NodeStatus.SUCCESS,
              resultUrl: dataUrl,
              aspectRatio: '16:9',
              model: 'Uploaded',
              videoModel: 'Uploaded',
              resolution: 'Auto',
              parentIds: [],
              title: file.name
            };
            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds([nodeId]);
          };
          video.src = dataUrl;
          video.load();
        }
      };

      reader.onerror = () => {
        console.error(`[CanvasDrop] 读取文件失败: ${file.name}`);
      };

      reader.readAsDataURL(file);
    });
  }, [screenToCanvas, setNodes, setSelectedNodeIds]);

  return {
    dropFeedback,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
