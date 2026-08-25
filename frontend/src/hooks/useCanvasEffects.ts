/**
 * useCanvasEffects.ts
 * 
 * Canvas-level effects: wheel event prevention, group cleanup,
 * and undo/redo history tracking.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { NodeData, NodeGroup } from '../types';

interface UseCanvasEffectsOptions {
    canvasRef: React.RefObject<HTMLDivElement>;
    nodes: NodeData[];
    groups: NodeGroup[];
    isDragging: boolean;
    historyState: { nodes: NodeData[]; groups: NodeGroup[] };
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
    setGroups: React.Dispatch<React.SetStateAction<NodeGroup[]>>;
    pushHistory: (state: { nodes: NodeData[]; groups: NodeGroup[] }) => void;
    cleanupInvalidGroups: (nodes: NodeData[], setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>) => void;
    updateNode: (id: string, updates: Partial<NodeData>) => void;
}

export const useCanvasEffects = ({
    canvasRef,
    nodes,
    groups,
    isDragging,
    historyState,
    setNodes,
    setGroups,
    pushHistory,
    cleanupInvalidGroups,
    updateNode
}: UseCanvasEffectsOptions) => {
    // ============================================================================
    // WHEEL EVENT PREVENTION
    // ============================================================================

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleNativeWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        };

        canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleNativeWheel);
    }, [canvasRef]);

    // ============================================================================
    // GROUP CLEANUP
    // ============================================================================

    useEffect(() => {
        cleanupInvalidGroups(nodes, setNodes);
    }, [nodes, cleanupInvalidGroups, setNodes]);

    // ============================================================================
    // UNDO/REDO HISTORY TRACKING
    // ============================================================================

    const isApplyingHistory = useRef(false);

    useEffect(() => {
        // Don't push to history if we're currently applying history (undo/redo)
        if (isApplyingHistory.current) {
            // Also check if strict mode or internal react timing caused a double invoke
            isApplyingHistory.current = false;
            return;
        }

        // Don't push to history while dragging (wait until drag ends)
        if (isDragging) {
            return;
        }

        // Safety: If current state EXACTLY matches the history state we just came from (or are trying to apply),
        // we might want to skip pushing to avoid "bounce back" if isApplyingHistory flag was reset too early.
        // However, pushHistory already handles deep equality checks against 'present'.
        // So this is just a redundant check, but harmless.

        // Push to history when nodes or groups change
        pushHistory({ nodes, groups });
    }, [nodes, groups, isDragging, pushHistory]);

    // Apply history state when undo/redo is triggered
    useEffect(() => {
        // Compare references first, then values? useHistory normally returns new objects.
        if (historyState.nodes !== nodes || historyState.groups !== groups) {
            isApplyingHistory.current = true;
            setNodes(historyState.nodes);
            setGroups(historyState.groups);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyState]);

    // ============================================================================
    // UPDATE NODE WRAPPER
    // ============================================================================

    // Simple wrapper for updateNode (sync code removed - TEXT node prompts are combined at generation time)
    const updateNodeWithSync = useCallback((id: string, updates: Partial<NodeData>) => {
        updateNode(id, updates);
    }, [updateNode]);

    return {
        updateNodeWithSync
    };
};
