
export enum NodeType {
  TEXT = 'Text',
  IMAGE = 'Image',
  VIDEO = 'Video',
  AUDIO = 'Audio',
  IMAGE_EDITOR = 'Image Editor',
  VIDEO_EDITOR = 'Video Editor',
  STORYBOARD = 'Storyboard Manager',
  CAMERA_ANGLE = 'Camera Angle',
  // Local open-source model nodes
  LOCAL_IMAGE_MODEL = 'Local Image Model',
  LOCAL_VIDEO_MODEL = 'Local Video Model',
  // AI Manga specific nodes
  SCRIPT = 'Script',
  CHARACTER = 'Character',
  SCENE = 'Scene',
  SHOT = 'Shot',
  PROMPT = 'Prompt',
  EDIT = 'Edit',
  COMFYUI_TASK = 'ComfyUI Task',
}

export enum NodeStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface NodeData {
  id: string;
  type: NodeType;
  title?: string; // Custom title for the node (defaults to type if not set)
  x: number;
  y: number;
  prompt: string;
  status: NodeStatus;
  resultUrl?: string; // Image URL or Video URL
  lastFrame?: string; // For Video nodes: base64/url of the last frame to use as input for next node
  parentIds?: string[]; // For connecting lines (supports multiple inputs)
  groupId?: string; // ID of the group this node belongs to
  errorMessage?: string;

  // Text node specific
  textMode?: 'menu' | 'editing'; // For Text nodes: current mode
  linkedVideoNodeId?: string; // For Text nodes: linked video node for prompt sync

  // Video node specific
  videoMode?: 'standard' | 'frame-to-frame' | 'motion-control'; // Video generation mode
  frameInputs?: { nodeId: string; order: 'start' | 'end' }[]; // For frame-to-frame: connected image nodes
  videoModel?: string; // Video model version (e.g., 'veo-3.1', 'kling-v2-1')
  videoDuration?: number; // Video duration in seconds (e.g., 5, 6, 8, 10)
  generateAudio?: boolean; // Whether to generate native audio (Kling 2.6, Veo 3.1)
  inputUrl?: string; // Input URL for video generation (image-to-video)

  // Video Editor specific
  trimStart?: number; // Trim start time in seconds
  trimEnd?: number; // Trim end time in seconds

  // Settings
  model: string;
  imageModel?: string; // Image model version (e.g., 'gemini-pro', 'kling-v2')
  aspectRatio: string;
  resolution: string;
  isPromptExpanded?: boolean; // Whether the prompt editing area is expanded
  resultAspectRatio?: string; // Actual aspect ratio of the generated image (e.g., '16/9')
  generationStartTime?: number; // Timestamp when generation started (for recovery race condition prevention)

  // Kling V1.5 Image Reference Settings
  klingReferenceMode?: 'subject' | 'face'; // Reference type for image-to-image
  klingFaceIntensity?: number; // Face reference intensity (0-100)
  klingSubjectIntensity?: number; // Subject reference intensity (0-100)
  detectedFaces?: { x: number; y: number; width: number; height: number }[]; // Detected face bounding boxes
  faceDetectionStatus?: 'idle' | 'loading' | 'success' | 'error'; // Face detection status

  // Image Editor state persistence
  editorElements?: Array<{
    id: string;
    type: 'arrow' | 'text';
    // Arrow properties
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    color?: string;
    lineWidth?: number;
    // Text properties
    x?: number;
    y?: number;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
  }>; // Elements (arrows, text) drawn in image editor
  editorCanvasData?: string; // Base64 brush/eraser canvas data
  editorCanvasSize?: { width: number; height: number }; // Size of the canvas when elements were saved (for scaling)
  editorBackgroundUrl?: string; // Clean background image URL (without elements) for re-editing

  // Change Angle mode (Image nodes only)
  angleMode?: boolean; // Whether the node is in angle editing mode
  angleSettings?: {
    rotation: number;  // Horizontal rotation in degrees (-180 to 180)
    tilt: number;      // Vertical tilt in degrees (-90 to 90)
    scale: number;     // Scale factor (0 to 100)
    wideAngle: boolean; // Whether to use wide-angle lens perspective
  };

  // Local Model node specific
  localModelId?: string;        // ID of the selected local model
  localModelPath?: string;      // Absolute path to model file on disk
  localModelType?: 'diffusion' | 'controlnet' | 'lora' | 'camera-control';
  localModelArchitecture?: string; // Model architecture (e.g., 'sd15', 'sdxl', 'qwen')

  // Storyboard Generator specific
  characterReferenceUrls?: string[]; // URLs of character images for reference in generation

  // === AI Manga (Manju Studio) specific fields ===

  // Script node specific
  scriptData?: {
    episodes: any[];
    totalBeats: number;
    templateId?: string;
  };

  // Character node specific
  characterData?: {
    tag: string;
    name: string;
    appearance: string;
    forms: CharacterForm[];
    arc?: CharacterArc;
  };

  // Scene node specific
  sceneData?: {
    tag: string;
    name: string;
    geoLayout: string;
    lighting: string;
    views: SceneView[];
  };

  // Shot node specific
  shotData?: {
    beatId: string;
    shotSize: string;
    cameraMovement: string;
    characters: string[];
    characterPositions: string;
    action: string;
    dialogueId?: string;
    emotionIntensity: number;
    continuityMode: string;
    compositionRef?: string;
  };

  // Prompt node specific
  promptData?: {
    krea2Prompt: string;
    minimaxH3Prompt: string;
    qwenEditPrompt: string;
    forbiddenWords: string[];
    version: number;
  };

  // Edit node specific
  editData?: {
    steps: EditStep[];
    currentStep: number;
  };

  // ComfyUI Task node specific
  comfyuiData?: {
    workflowId: string;
    taskId?: string;
    status: 'idle' | 'running' | 'completed' | 'failed';
    progress: number;
    resultUrl?: string;
    inputUrl?: string;
    inputType?: 'image' | 'video';
    parameters: Record<string, any>;
  };

  // Process stage binding
  processStageId?: string; // Which process stage this node belongs to
}

// === AI Manga data structures ===

export interface CharacterForm {
  formName: string;
  threeGridPrompt: string;
  microLifeProfile: MicroLifeProfile;
  images: CharacterImage[];
}

export interface MicroLifeProfile {
  blinkPattern: string;
  handHabit: string;
  emotionMuscleMap: Record<string, string>;
  eyeMovement: string;
  reactionTiming: string;
}

export interface CharacterImage {
  imageType: string;
  imagePath: string;
  description: string;
  expression?: string;
}

export interface CharacterArc {
  characterTag: string;
  arcType: string;
  startState: Record<string, string>;
  turningPoints: TurningPoint[];
  endState: Record<string, string>;
}

export interface TurningPoint {
  at: string;
  event: string;
  change: string;
}

export interface SceneView {
  viewName: string;
  referenceImage: string;
  geoLayout: string;
}

export interface EditStep {
  stepType: string;
  enabled: boolean;
  instruction: string;
  maskDescription: string;
  referenceImage: string;
  outputImage: string;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'global' | 'node-connector' | 'node-options' | 'add-nodes'; // 'global' = right click on canvas, 'add-nodes' = double click
  sourceNodeId?: string; // If 'node-connector' or 'node-options', which node originated the click
  connectorSide?: 'left' | 'right';
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SelectionBox {
  isActive: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface NodeGroup {
  id: string;
  nodeIds: string[];
  label: string;
  storyContext?: {
    story: string;
    scripts: any[];
    selectedCharacters?: any[]; // CharacterAsset[]
    sceneCount?: number;
    styleAnchor?: string;
    characterDNA?: Record<string, string>;
    compositeImageUrl?: string | null;
  };
}
