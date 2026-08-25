import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterAsset } from '../hooks/useStoryboardGenerator';

interface StoryInputProps {
    value: string;
    onChange: (value: string) => void;
    assets: CharacterAsset[]; // For resolving names to images
    placeholder?: string;
    className?: string;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    inputRef?: React.RefObject<HTMLDivElement>;
    readOnly?: boolean;
}

export const StoryInput: React.FC<StoryInputProps> = ({
    value,
    onChange,
    assets,
    placeholder,
    className,
    onBlur,
    onKeyDown,
    inputRef,
    readOnly = false
}) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = inputRef || internalRef;
    const lastValue = useRef(value);

    // Helper to escape HTML characters to prevent XSS when rendering raw text
    const escapeHtml = (text: string) => {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Convert plain text to HTML with chips
    const textToHtml = useCallback((text: string) => {
        if (!text) return '';
        let html = escapeHtml(text);

        // Sort assets by name length (descending) to avoid partial matches
        const sortedAssets = [...assets].sort((a, b) => b.name.length - a.name.length);

        sortedAssets.forEach(asset => {
            const exactMention = `@${asset.name}`;
            const normalizedName = asset.name.replace(/\s+/g, '');
            const normalizedMention = `@${normalizedName}`;

            // Create pattern to match either exact or normalized (space-stripped) variation
            // Escape special chars in name
            const escExact = exactMention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escNorm = normalizedMention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Regex: (@Exact Name|@ExactName) followed by boundary
            // We use a capture group so we can replace strictly what matched
            const regex = new RegExp(`(${escExact}|${escNorm})(?=\\s|$|\\.|,|!|\\?)`, 'g');

            const chipHtml = `
<span class="inline-flex items-center gap-1.5 align-middle bg-violet-500/10 border border-violet-500/30 rounded px-1.5 py-0.5 mx-0.5 select-none" contenteditable="false" data-mention="${exactMention}">
<img src="${asset.url}" class="w-4 h-4 rounded-sm object-cover" />
<span class="text-violet-300 font-medium text-xs">${exactMention}</span>
</span>`.trim().replace(/\n/g, '');

            html = html.replace(regex, chipHtml);
        });

        // Preserve newlines
        return html.replace(/\n/g, '<br>');
    }, [assets]);

    // Save cursor position
    const saveSelection = (containerEl: Node) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        try {
            const range = selection.getRangeAt(0);
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(containerEl);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            return preSelectionRange.toString().length;
        } catch (e) {
            return null;
        }
    };

    // Restore cursor position
    const restoreSelection = (containerEl: Node, savedPos: number) => {
        if (savedPos === null) return;
        let charIndex = 0;
        const range = document.createRange();
        range.setStart(containerEl, 0);
        range.collapse(true);
        const nodeStack = [containerEl];
        let node;
        let found = false;

        while (!found && (node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                const nextCharIndex = charIndex + (node.nodeValue?.length || 0);
                if (!found && savedPos >= charIndex && savedPos <= nextCharIndex) {
                    range.setStart(node, savedPos - charIndex);
                    range.collapse(true);
                    found = true;
                }
                charIndex = nextCharIndex;
            } else {
                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    // Update innerHTML when prop value changes
    useEffect(() => {
        if (!ref.current) return;

        // Normalize: innerText puts \n for <br>, usually.
        const currentText = ref.current.innerText;

        // Only update if external value differs materially or if we need to hydrate chips
        // We'll trust that if value !== currentText, an update is needed.
        if (value !== currentText) {
            const savedPos = document.activeElement === ref.current ? saveSelection(ref.current) : null;
            ref.current.innerHTML = textToHtml(value);
            if (savedPos !== null) {
                restoreSelection(ref.current, savedPos);
            } else if (document.activeElement === ref.current) {
                // Fallback: put cursor at end
                const range = document.createRange();
                range.selectNodeContents(ref.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }
        lastValue.current = value;
    }, [value, textToHtml]);

    const handleInput = (e: React.SyntheticEvent<HTMLDivElement>) => {
        if (ref.current) {
            const plainText = ref.current.innerText;
            if (plainText !== lastValue.current) {
                lastValue.current = plainText;
                onChange(plainText);
            }
        }
    };

    return (
        <div className="relative w-full h-full">
            {!value && placeholder && (
                <div className="absolute top-4 left-4 text-neutral-500 pointer-events-none text-sm">
                    {placeholder}
                </div>
            )}
            <div
                ref={ref}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onInput={!readOnly ? handleInput : undefined}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className={`w-full h-full ${readOnly ? 'cursor-default' : 'cursor-text focus:border-purple-500'} bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white text-sm focus:outline-none overflow-y-auto whitespace-pre-wrap ${className}`}
                style={{ minHeight: '12rem' }} // h-48 equivalent
            />
        </div>
    );
};
