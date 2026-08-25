/**
 * useWorkflowTracking.ts
 * 
 * Manages dirty state tracking and provides wrapper functions for
 * save/load/new canvas operations with proper state management.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NodeData } from '../types';

interface UseWorkflowTrackingOptions {
    nodes: NodeData[];
    canvasTitle: string;
    handleSaveWorkflow: () => Promise<void>;
    handleLoadWorkflow: (id: string) => Promise<void>;
    resetWorkflowId: () => void;
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    setCanvasTitle: (title: string) => void;
    setEditingTitleValue: (value: string) => void;
}

export const useWorkflowTracking = ({
    nodes,
    canvasTitle,
    handleSaveWorkflow,
    handleLoadWorkflow,
    resetWorkflowId,
    setNodes,
    setSelectedNodeIds,
    setCanvasTitle,
    setEditingTitleValue
}: UseWorkflowTrackingOptions) => {
    // ============================================================================
    // DIRTY STATE
    // ============================================================================

    const [isDirty, setIsDirty] = useState(false);
    const hasUnsavedChanges = isDirty && nodes.length > 0;

    // Mark as dirty when nodes change (after initial load)
    const prevNodesLengthRef = useRef(nodes.length);
    const prevTitleRef = useRef(canvasTitle);

    useEffect(() => {
        if (nodes.length !== prevNodesLengthRef.current || canvasTitle !== prevTitleRef.current) {
            setIsDirty(true);
            prevNodesLengthRef.current = nodes.length;
            prevTitleRef.current = canvasTitle;
        }
    }, [nodes.length, canvasTitle]);

    // ============================================================================
    // WRAPPER FUNCTIONS
    // ============================================================================

    // Update saved state after workflow save
    const handleSaveWithTracking = useCallback(async () => {
        await handleSaveWorkflow();
        setIsDirty(false);
    }, [handleSaveWorkflow]);

    // Load workflow and update tracking
    const handleLoadWithTracking = useCallback(async (id: string) => {
        await handleLoadWorkflow(id);
        setIsDirty(false);
    }, [handleLoadWorkflow]);

    // Create new canvas
    const handleNewCanvas = useCallback(() => {
        setNodes([]);
        setSelectedNodeIds([]);
        setCanvasTitle('Untitled Canvas');
        setEditingTitleValue('Untitled Canvas');
        resetWorkflowId();
        setIsDirty(false);
    }, [setNodes, setSelectedNodeIds, setCanvasTitle, setEditingTitleValue, resetWorkflowId]);

    return {
        isDirty,
        setIsDirty,
        hasUnsavedChanges,
        handleSaveWithTracking,
        handleLoadWithTracking,
        handleNewCanvas
    };
};
