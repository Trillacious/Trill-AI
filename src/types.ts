export type EndpointCategory = 
  | 'text' 
  | 'vision' 
  | 'video' 
  | 'voice' 
  | 'translate' 
  | 'ml' 
  | 'education' 
  | 'camera'
  | 'metrics'
  | 'history';

export interface ModelOption {
  id: string;
  name: string;
  category: string;
  provider: string;
  description: string;
  speed: 'Ultra-Fast' | 'Fast' | 'Standard' | 'Heavy';
  recommendedFor?: string;
}

export interface AppSettings {
  baseUrl: string;
  // Text & Reasoning Parameters
  defaultTextModel: string;
  defaultReasonModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  stream: boolean;
  streamSpeed: 'fast' | 'normal' | 'slow' | 'instant';

  // Vision & Image Generation Parameters
  defaultVisionModel: string;
  defaultImageModel: string;
  imageWidth: number;
  imageHeight: number;
  imageGuidance: number;
  imageSteps: number;
  imageStrength: number;
  defaultFacePreset: string;

  // Video Dynamics Parameters
  videoDuration: number;
  videoResolution: '480p' | '720p' | '1080p';
  videoFps: number;

  // Voice & Audio Parameters
  defaultVoiceModel: string;
  voiceTtsProfile: string;
  sttLanguage: string;
  voiceTranslateTts: boolean;
  autoPlayAudio: boolean;

  // Translation Parameters
  defaultSourceLang: string;
  defaultTargetLang: string;

  // ML & Education Parameters
  defaultEmbedModel: string;
  educationLevel: string;

  // Network & Resilience
  timeoutSeconds: number;
  autoRetryAttempts: number;
  soundEnabled: boolean;
  autoSaveHistory: boolean;
}

export interface TokenUsageRecord {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  neurons: number;
  latencyMs: number;
  model: string;
  endpoint: string;
  timestamp: number;
  success: boolean;
}

export interface TimeBucketMetric {
  period: string;
  label: string;
  timestamp: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  neurons: number;
  requests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface AggregatedMetrics {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalNeurons: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  modelDistribution: Record<string, number>;
  endpointDistribution: Record<string, number>;
  dailyBreakdown: TimeBucketMetric[];
  weeklyBreakdown: TimeBucketMetric[];
  monthlyBreakdown: TimeBucketMetric[];
  historyByDay: Record<string, number>;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  endpoint: string;
  category: EndpointCategory;
  model: string;
  prompt: string;
  system?: string;
  output: {
    type: 'text' | 'image' | 'video' | 'audio' | 'json';
    content: string; // text string, JSON string, or data URL / blob URL
    mediaUrl?: string;
    extra?: any;
  };
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
    neurons?: number;
  };
  latencyMs?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  parameters?: Record<string, any>;
}

export interface FacePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'Expression' | 'Direction' | 'Age' | 'Hair' | 'Style' | 'Lighting';
}

export interface CurriculumLevel {
  label: string;
  subjects?: string[];
  fields?: string[];
}

export interface CurriculumData {
  description: string;
  totalLevels: number;
  curriculum: Record<string, CurriculumLevel>;
}
