/**
 * useAutoSave.ts
 * 
 * Custom hook that periodically saves the canvas state to the backend
 * if there are unsaved changes and no active generations.
 */

import { useEffect, useRef } from 'react';
import { NodeData, NodeStatus } from '../types';

interface UseAutoSaveOptions {
    isDirty: boolean;
    nodes: NodeData[];
    onSave: () => Promise<void>;
    interval?: number; // In milliseconds, default 60s
}

export const useAutoSave = ({
    isDirty,
    nodes,
    onSave,
    interval = 60000
}: UseAutoSaveOptions) => {
    const lastSaveTimeRef = useRef<number>(Date.now());
    const isSavingRef = useRef<boolean>(false);

    useEffect(() => {
        const checkAndSave = async () => {
            // Only save if dirty and we have nodes
            if (!isDirty || nodes.length === 0) return;

            // Don't save if already in the middle of a save operation
            if (isSavingRef.current) return;

            try {
                isSavingRef.current = true;
                console.log('[Auto-Save] Triggering periodic save...');
                await onSave();
                lastSaveTimeRef.current = Date.now();
            } catch (error) {
                console.error('[Auto-Save] Failed to auto-save:', error);
            } finally {
                isSavingRef.current = false;
            }
        };

        const timer = setInterval(checkAndSave, interval);

        return () => clearInterval(timer);
    }, [isDirty, nodes, onSave, interval]);

    return {
        lastSaveTime: lastSaveTimeRef.current
    };
};
