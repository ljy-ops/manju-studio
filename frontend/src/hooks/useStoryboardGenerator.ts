/**
 * useStoryboardGenerator.ts
 * 
 * Custom hook for managing storyboard generation workflow.
 * Handles character selection, story input, script generation, and node creation.
 */

import { useState, useCallback } from 'react';
import { NodeData, NodeStatus, NodeType, Viewport } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface CharacterAsset {
    id: string;
    name: string;
    url: string;
    description?: string;
    category?: string; // 'Character' | 'Scene' | 'Item' | 'Style' | 'Others'
}

export interface SceneScript {
    sceneNumber: number;
    description: string;
    cameraAngle: string;
    cameraMovement?: string;
    lighting?: string;
    mood: string;
}

export interface StoryboardState {
    step: 'characters' | 'story' | 'scripts' | 'preview' | 'generate';
    selectedCharacters: CharacterAsset[];
    sceneCount: number;
    story: string;
    scripts: SceneScript[];
    styleAnchor: string;
    characterDNA: Record<string, string>;
    compositeImageUrl: string | null;
    isGeneratingPreview: boolean;
    isGenerating: boolean;
    isBrainstorming: boolean;
    isOptimizing: boolean;
    error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

interface StoryboardGroupInfo {
    groupId: string;
    groupLabel: string;
    storyContext?: {
        story: string;
        scripts: SceneScript[];
        selectedCharacters?: CharacterAsset[];
        sceneCount?: number;
        styleAnchor?: string;
        characterDNA?: Record<string, string>;
        compositeImageUrl?: string | null;
    };
}

interface UseStoryboardGeneratorProps {
    onCreateNodes: (nodes: Partial<NodeData>[], groupInfo?: StoryboardGroupInfo) => void;
    viewport: Viewport;
}

export const useStoryboardGenerator = ({ onCreateNodes, viewport }: UseStoryboardGeneratorProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [state, setState] = useState<StoryboardState>({
        step: 'characters',
        selectedCharacters: [],
        sceneCount: 3,
        story: '',
        scripts: [],
        styleAnchor: '',
        characterDNA: {},
        compositeImageUrl: null,
        isGeneratingPreview: false,
        isGenerating: false,
        isBrainstorming: false,
        isOptimizing: false,
        error: null
    });

    // ============================================================================
    // MODAL CONTROLS
    // ============================================================================

    const openModal = useCallback(() => {
        setIsModalOpen(true);
        // Reset state when opening
        setState({
            step: 'characters',
            selectedCharacters: [],
            sceneCount: 3,
            story: '',
            scripts: [],
            styleAnchor: '',
            characterDNA: {},
            compositeImageUrl: null,
            isGeneratingPreview: false,
            isGenerating: false,
            isBrainstorming: false,
            isOptimizing: false,
            error: null
        });
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    // ============================================================================
    // STATE UPDATES
    // ============================================================================

    const setStep = useCallback((step: StoryboardState['step']) => {
        setState(prev => ({ ...prev, step, error: null }));
    }, []);

    const setSelectedCharacters = useCallback((characters: CharacterAsset[]) => {
        setState(prev => ({ ...prev, selectedCharacters: characters }));
    }, []);

    const toggleCharacter = useCallback((character: CharacterAsset) => {
        setState(prev => {
            const isSelected = prev.selectedCharacters.some(c => c.id === character.id);
            if (isSelected) {
                return {
                    ...prev,
                    selectedCharacters: prev.selectedCharacters.filter(c => c.id !== character.id)
                };
            } else {
                // Limit to 3 characters max
                if (prev.selectedCharacters.length >= 3) {
                    return { ...prev, error: 'Maximum 3 characters allowed' };
                }
                return {
                    ...prev,
                    selectedCharacters: [...prev.selectedCharacters, character],
                    error: null
                };
            }
        });
    }, []);

    const setSceneCount = useCallback((count: number) => {
        setState(prev => ({ ...prev, sceneCount: Math.max(1, Math.min(10, count)) }));
    }, []);

    const setStory = useCallback((story: string) => {
        setState(prev => ({ ...prev, story }));
    }, []);

    const setSelectedImageModel = useCallback((model: string) => {
        setState(prev => ({ ...prev, selectedImageModel: model }));
    }, []);

    const updateScript = useCallback((index: number, updates: Partial<SceneScript>) => {
        setState(prev => ({
            ...prev,
            scripts: prev.scripts.map((script, i) =>
                i === index ? { ...script, ...updates } : script
            )
        }));
    }, []);

    // ============================================================================
    // API CALLS
    // ============================================================================

    const generateScripts = useCallback(async () => {
        if (!state.story.trim()) {
            setState(prev => ({ ...prev, error: 'Please enter a story' }));
            return;
        }


        setState(prev => ({
            ...prev,
            isGenerating: true,
            error: null,
            step: 'scripts',    // Transition immediately
            scripts: []         // Clear for skeleton loading
        }));

        try {
            const response = await fetch('/api/storyboard/generate-scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story: state.story,
                    characterDescriptions: state.selectedCharacters.map(c => ({
                        name: c.name,
                        description: c.description || 'A reference',
                        category: c.category || 'Others'
                    })),
                    sceneCount: state.sceneCount,
                    // Pass reference images with their categories
                    referenceImages: state.selectedCharacters.map(char => ({
                        name: char.name,
                        url: char.url,
                        category: char.category || 'Others'
                    }))
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate scripts');
            }

            const data = await response.json();
            setState(prev => ({
                ...prev,
                scripts: data.scripts,
                styleAnchor: data.styleAnchor || '',
                characterDNA: data.characterDNA || {},
                // step: 'scripts', // Already transitioned
                isGenerating: false
            }));
        } catch (error) {
            console.error('[Storyboard] Script generation error:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to generate scripts',
                isGenerating: false
            }));
        }
    }, [state.story, state.selectedCharacters, state.sceneCount]);

    const brainstormStory = useCallback(async () => {
        setState(prev => ({ ...prev, isBrainstorming: true, error: null }));

        try {
            const response = await fetch('/api/storyboard/brainstorm-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterDescriptions: state.selectedCharacters.map(c => ({
                        name: c.name,
                        description: c.description || 'A character'
                    })),
                    // Pass reference images for multimodal brainstorming
                    referenceImages: state.selectedCharacters.map(char => ({
                        name: char.name,
                        url: char.url,
                        category: char.category || 'Others'
                    }))
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to brainstorm story');
            }

            const data = await response.json();
            setState(prev => ({
                ...prev,
                story: data.story,
                isBrainstorming: false
            }));
        } catch (error) {
            console.error('[Storyboard] Brainstorm error:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to brainstorm story',
                isBrainstorming: false
            }));
        }
    }, [state.selectedCharacters]);

    const optimizeStory = useCallback(async () => {
        if (!state.story.trim()) {
            setState(prev => ({ ...prev, error: 'Please enter a story first' }));
            return;
        }

        setState(prev => ({ ...prev, isOptimizing: true, error: null }));

        try {
            const response = await fetch('/api/storyboard/optimize-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story: state.story,
                    characterNames: state.selectedCharacters.map(c => c.name)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to optimize story');
            }

            const data = await response.json();
            setState(prev => ({
                ...prev,
                story: data.optimizedStory,
                isOptimizing: false
            }));
        } catch (error) {
            console.error('[Storyboard] Optimization error:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to optimize story',
                isOptimizing: false
            }));
        }
    }, [state.story]);

    // Generate composite storyboard preview image
    const generateComposite = useCallback(async () => {
        setState(prev => ({ ...prev, isGeneratingPreview: true, error: null }));

        try {
            const response = await fetch('/api/storyboard/generate-composite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scripts: state.scripts,
                    styleAnchor: state.styleAnchor,
                    characterDNA: state.characterDNA,
                    sceneCount: state.scripts.length,
                    // Pass reference images with their categories
                    referenceImages: state.selectedCharacters.map(char => ({
                        name: char.name,
                        url: char.url,
                        category: char.category || 'Others'
                    }))
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate composite preview');
            }

            const data = await response.json();
            setState(prev => ({
                ...prev,
                compositeImageUrl: data.imageUrl,
                step: 'preview',
                isGeneratingPreview: false
            }));
        } catch (error) {
            console.error('[Storyboard] Composite generation error:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to generate preview',
                isGeneratingPreview: false
            }));
        }
    }, [state.scripts, state.styleAnchor, state.characterDNA]);

    // Regenerate composite image if user wants to try again
    const regenerateComposite = useCallback(async () => {
        // Transition to preview step immediately to show loading state
        setState(prev => ({ ...prev, step: 'preview' }));
        await generateComposite();
    }, [generateComposite]);

    // ============================================================================
    // NODE CREATION
    // ============================================================================

    const createStoryboardNodes = useCallback(() => {
        if (state.scripts.length === 0) {
            setState(prev => ({ ...prev, error: 'No scripts to create' }));
            return;
        }

        // Calculate center position
        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
        const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

        // Calculate node layout (horizontal, with spacing)
        const NODE_WIDTH = 340;
        const NODE_GAP = 100;
        const totalWidth = state.scripts.length * NODE_WIDTH + (state.scripts.length - 1) * NODE_GAP;
        const startX = centerX - totalWidth / 2;

        // Get character image URLs for reference (to maintain character consistency)
        const characterImageUrls = state.selectedCharacters
            .filter(c => c.url)
            .map(c => c.url);

        // Generate a shared group ID for all storyboard nodes
        const storyboardGroupId = crypto.randomUUID();

        // Create nodes for each script - use composite image as reference
        const newNodes: Partial<NodeData>[] = state.scripts.map((script, index) => {
            // Build scene extraction prompt that references the composite storyboard
            // The composite image will be passed as the reference image
            const sceneNumber = script.sceneNumber || (index + 1);
            const prompt = state.compositeImageUrl
                ? `Extract panel #${sceneNumber} from this storyboard reference image. Keep all characters, environment, colors, art style, and composition exactly the same. Recreate only this single panel as a standalone 16:9 image.`
                : `${state.styleAnchor || 'photorealistic, cinematic lighting, high detail'}. ${script.description}. Camera: ${script.cameraAngle}. Mood: ${script.mood}.`;

            // Use composite image as the primary reference, fallback to character images
            const referenceUrls = state.compositeImageUrl
                ? [state.compositeImageUrl]
                : characterImageUrls.length > 0 ? characterImageUrls : undefined;

            return {
                id: crypto.randomUUID(),
                type: NodeType.IMAGE,
                x: startX + index * (NODE_WIDTH + NODE_GAP),
                y: centerY - 100,
                prompt,
                // Set to IDLE - handleGenerate will set to LOADING when called
                status: NodeStatus.IDLE,
                // Default to Nano Banana Pro (gemini-3-pro-image-preview)
                model: 'gemini-pro',
                imageModel: 'gemini-3-pro-image-preview',
                aspectRatio: '16:9',
                resolution: '1K',
                title: `Scene ${sceneNumber}`,
                parentIds: [],
                // Assign group ID for auto-grouping
                groupId: storyboardGroupId,
                // Use composite image as reference for consistent scene extraction
                characterReferenceUrls: referenceUrls
            };
        });

        // Pass the group info along with nodes for App.tsx to create the group
        onCreateNodes(newNodes, {
            groupId: storyboardGroupId,
            groupLabel: `Storyboard ${new Date().toLocaleTimeString()}`,
            storyContext: {
                story: state.story,
                scripts: state.scripts,
                selectedCharacters: state.selectedCharacters,
                sceneCount: state.sceneCount,
                styleAnchor: state.styleAnchor,
                characterDNA: state.characterDNA,
                compositeImageUrl: state.compositeImageUrl
            }
        });
        closeModal();
    }, [state.scripts, state.selectedCharacters, state.styleAnchor, state.compositeImageUrl, viewport, onCreateNodes, closeModal]);

    // Restore state from saved context to edit an existing storyboard
    const editStoryboard = useCallback((context: NonNullable<StoryboardGroupInfo['storyContext']>) => {
        const hasComposite = !!context.compositeImageUrl;
        setState({
            step: hasComposite ? 'preview' : 'scripts', // Only jump to preview if we have the image, otherwise go to scripts to avoid auto-regen
            selectedCharacters: context.selectedCharacters || [],
            sceneCount: context.sceneCount || 3,
            story: context.story,
            scripts: context.scripts,
            styleAnchor: context.styleAnchor || '',
            characterDNA: context.characterDNA || {},
            compositeImageUrl: context.compositeImageUrl || null,
            isGeneratingPreview: false,
            isGenerating: false,
            isBrainstorming: false,
            isOptimizing: false,
            error: null
        });
        setIsModalOpen(true);
    }, []);

    return {
        isModalOpen,
        openModal,
        closeModal,
        editStoryboard,
        state,
        setStep,
        setSelectedCharacters,
        toggleCharacter,
        setSceneCount,
        setStory,
        updateScript,
        generateScripts,
        brainstormStory,
        optimizeStory,
        generateComposite,
        regenerateComposite,
        createStoryboardNodes
    };
};
