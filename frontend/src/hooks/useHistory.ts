/**
 * useHistory.ts
 * 
 * Custom hook for managing undo/redo history.
 * Implements a past/present/future pattern for state management.
 */

import { useState, useCallback } from 'react';

export const useHistory = <T>(initialState: T, maxHistorySize: number = 50) => {
    // ============================================================================
    // STATE
    // ============================================================================

    const [past, setPast] = useState<T[]>([]);
    const [present, setPresent] = useState<T>(initialState);
    const [future, setFuture] = useState<T[]>([]);

    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    // ============================================================================
    // OPERATIONS
    // ============================================================================

    /**
     * Undo the last action
     * Moves present to future, pops from past to present
     */
    const undo = useCallback(() => {
        if (!canUndo) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setPast(newPast);
        setPresent(previous);
        setFuture([present, ...future]);
    }, [canUndo, past, present, future]);

    /**
     * Redo the last undone action
     * Moves present to past, pops from future to present
     */
    const redo = useCallback(() => {
        if (!canRedo) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast([...past, present]);
        setPresent(next);
        setFuture(newFuture);
    }, [canRedo, past, present, future]);

    /**
     * Push a new state to history
     * Clears redo stack and adds current state to past
     * @param newState - New state to push
     */
    const pushHistory = useCallback((newState: T) => {
        // Skip if state hasn't changed (deep comparison)
        if (JSON.stringify(newState) === JSON.stringify(present)) {
            return;
        }

        // Add current state to past (with size limit)
        const newPast = [...past.slice(-maxHistorySize + 1), present];

        setPast(newPast);
        setPresent(newState);
        setFuture([]); // Clear redo stack on new action
    }, [past, present, maxHistorySize]);

    /**
     * Reset history to a new initial state
     * Clears all history
     * @param newState - New initial state
     */
    const reset = useCallback((newState: T) => {
        setPast([]);
        setPresent(newState);
        setFuture([]);
    }, []);

    // ============================================================================
    // RETURN
    // ============================================================================

    return {
        present,
        undo,
        redo,
        pushHistory,
        reset,
        canUndo,
        canRedo
    };
};
