/**
 * usePointerHandlers.ts
 * 
 * Handles canvas pointer events: pointer down, move, up.
 * Manages selection, panning, node dragging, and connection completion.
 */

import React, { useCallback } from 'react';
import { NodeData, NodeType, Viewport, ContextMenuState } from '../types';

interface UsePointerHandlersOptions {
    nodes: NodeData[];
    viewport: Viewport;
    selectedNodeIds: string[];
    isSelecting: boolean;
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    setSelectedConnection: React.Dispatch<React.SetStateAction<{ parentId: string; childId: string } | null>>;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>>;
    setViewport: React.Dispatch<React.SetStateAction<Viewport>>;

    // Selection box
    startSelection: (e: React.PointerEvent) => void;
    updateSelection: (e: React.PointerEvent) => boolean;
    endSelection: (nodes: NodeData[], viewport: Viewport) => string[];
    clearSelection: () => void;

    // Panning
    startPanning: (e: React.PointerEvent) => void;
    updatePanning: (e: React.PointerEvent, setViewport: React.Dispatch<React.SetStateAction<Viewport>>) => void;
    endPanning: () => void;

    // Node dragging
    updateNodeDrag: (
        e: React.PointerEvent,
        viewport: Viewport,
        setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
        selectedNodeIds: string[]
    ) => boolean;
    endNodeDrag: () => void;

    // Connection dragging
    updateConnectionDrag: (e: React.PointerEvent, nodes: NodeData[], viewport: Viewport) => boolean;
    completeConnectionDrag: (
        handleAddNext: (nodeId: string, direction: 'left' | 'right') => void,
        setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
        nodes: NodeData[],
        onConnectionMade?: (parentId: string, childId: string) => void
    ) => boolean;

    // Panel close functions
    closeWorkflowPanel: () => void;
    closeHistoryPanel: () => void;
    closeAssetLibrary: () => void;

    // Other
    releasePointerCapture: (e: React.PointerEvent) => void;
    handleAddNext: (nodeId: string, direction: 'left' | 'right') => void;
    updateNode: (id: string, updates: Partial<NodeData>) => void;
}

export const usePointerHandlers = ({
    nodes,
    viewport,
    selectedNodeIds,
    isSelecting,
    setNodes,
    setSelectedNodeIds,
    setSelectedConnection,
    setContextMenu,
    setViewport,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    startPanning,
    updatePanning,
    endPanning,
    updateNodeDrag,
    endNodeDrag,
    updateConnectionDrag,
    completeConnectionDrag,
    closeWorkflowPanel,
    closeHistoryPanel,
    closeAssetLibrary,
    releasePointerCapture,
    handleAddNext,
    updateNode
}: UsePointerHandlersOptions) => {

    // ============================================================================
    // CONNECTION MADE HANDLER
    // ============================================================================

    const handleConnectionMade = useCallback((parentId: string, childId: string) => {
        const parentNode = nodes.find(n => n.id === parentId);
        if (!parentNode) return;

        // If parent is a Text node, sync its prompt to the child
        if (parentNode.type === NodeType.TEXT && parentNode.prompt) {
            updateNode(childId, { prompt: parentNode.prompt });
        }
    }, [nodes, updateNode]);

    // ============================================================================
    // POINTER HANDLERS
    // ============================================================================

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).id === 'canvas-background') {
            // Left-click (button 0): Start selection box
            if (e.button === 0) {
                startSelection(e);
                clearSelection();
                setSelectedConnection(null);
                setContextMenu(prev => ({ ...prev, isOpen: false }));
                closeWorkflowPanel();
                closeHistoryPanel();
                closeAssetLibrary();
            }
            // Middle-click (button 1) or other: Start panning
            else {
                startPanning(e);
                setSelectedConnection(null);
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }
        }
    }, [
        startSelection,
        clearSelection,
        setSelectedConnection,
        setContextMenu,
        closeWorkflowPanel,
        closeHistoryPanel,
        closeAssetLibrary,
        startPanning
    ]);

    const handleGlobalPointerMove = useCallback((e: React.PointerEvent) => {
        // 1. Handle Selection Box Update
        if (updateSelection(e)) return;

        // 2. Handle Node Dragging
        if (updateNodeDrag(e, viewport, setNodes, selectedNodeIds)) return;

        // 3. Handle Connection Dragging
        if (updateConnectionDrag(e, nodes, viewport)) return;

        // 4. Handle Canvas Panning (disabled when selection box is active)
        if (!isSelecting) {
            updatePanning(e, setViewport);
        }
    }, [
        updateSelection,
        updateNodeDrag,
        viewport,
        setNodes,
        selectedNodeIds,
        updateConnectionDrag,
        nodes,
        isSelecting,
        updatePanning,
        setViewport
    ]);

    const handleGlobalPointerUp = useCallback((e: React.PointerEvent) => {
        // 1. Handle Selection Box End
        if (isSelecting) {
            const selectedIds = endSelection(nodes, viewport);
            setSelectedNodeIds(selectedIds);
            releasePointerCapture(e);
            return;
        }

        // 2. Handle Connection Drop
        if (completeConnectionDrag(handleAddNext, setNodes, nodes, handleConnectionMade)) {
            releasePointerCapture(e);
            return;
        }

        // 3. Stop Panning
        endPanning();

        // 4. Stop Node Dragging
        endNodeDrag();

        // 5. Release capture
        releasePointerCapture(e);
    }, [
        isSelecting,
        endSelection,
        nodes,
        viewport,
        setSelectedNodeIds,
        releasePointerCapture,
        completeConnectionDrag,
        handleAddNext,
        setNodes,
        handleConnectionMade,
        endPanning,
        endNodeDrag
    ]);

    return {
        handlePointerDown,
        handleGlobalPointerMove,
        handleGlobalPointerUp
    };
};
