/**
 * NodeConnectors.tsx
 * 
 * Renders the left and right connector buttons for a node.
 * Handles pointer events for drag-to-connect functionality.
 */

import React from 'react';
import { Plus } from 'lucide-react';

interface NodeConnectorsProps {
    nodeId: string;
    onConnectorDown: (e: React.PointerEvent, id: string, side: 'left' | 'right') => void;
    canvasTheme?: 'dark' | 'light';
}

export const NodeConnectors: React.FC<NodeConnectorsProps> = ({
    nodeId,
    onConnectorDown,
    canvasTheme = 'dark'
}) => {
    const isDark = canvasTheme === 'dark';

    const buttonClassName = `absolute w-10 h-10 rounded-full border flex items-center justify-center transition-all opacity-0 group-hover/node:opacity-100 z-10 cursor-crosshair ${isDark
            ? 'border-neutral-700 bg-[#0f0f0f] text-neutral-400 hover:text-white hover:border-neutral-500'
            : 'border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 hover:border-neutral-400 shadow-sm'
        }`;

    return (
        <>
            {/* Left Connector */}
            <button
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onConnectorDown(e, nodeId, 'left');
                }}
                className={`-left-12 top-1/2 -translate-y-1/2 ${buttonClassName}`}
            >
                <Plus size={18} />
            </button>

            {/* Right Connector */}
            <button
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onConnectorDown(e, nodeId, 'right');
                }}
                className={`-right-12 top-1/2 -translate-y-1/2 ${buttonClassName}`}
            >
                <Plus size={18} />
            </button>
        </>
    );
};
