import { LLMProvider } from '../types/finance';

export const MODEL_LOGOS: Record<string, string> = {
  gemini: 'https://ai.mux8.com/logos/gemini.jpg',
  openai: 'https://ai.mux8.com/logos/openai.jpg',
  zai: 'https://ai.mux8.com/logos/zai.jpg',
  deepseek: 'https://ai.mux8.com/logos/deepseek.jpg'
};

export interface ModelProviderOption {
  id: LLMProvider;
  name: string;
  tag: string;
  model: string;
  isApiBased: boolean;
  logo?: string;
  description: string;
}

export const MODEL_OPTIONS: ModelProviderOption[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    tag: 'gemini-3.8-flash',
    model: 'gemini-3.8-flash',
    isApiBased: true,
    logo: MODEL_LOGOS.gemini,
    description: 'High-speed analytical reasoning with structured financial insight.'
  },
  {
    id: 'edge',
    name: 'Browser Edge (Local)',
    tag: 'smolLM2 / 100% Offline',
    model: 'smolLM2-360M-instruct',
    isApiBased: false,
    description: 'Runs entirely in your browser using local WebAssembly & CacheStorage. Zero external API calls.'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tag: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
    isApiBased: true,
    logo: MODEL_LOGOS.openai,
    description: 'Advanced conversational capabilities with custom OpenAI API key.'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    tag: 'deepseek-chat',
    model: 'deepseek-chat',
    isApiBased: true,
    logo: MODEL_LOGOS.deepseek,
    description: 'DeepSeek-V3 conversational engine with fast token throughput.'
  },
  {
    id: 'zai',
    name: 'Z.ai / Zhipu',
    tag: 'glm-4-flash',
    model: 'glm-4-flash',
    isApiBased: true,
    logo: MODEL_LOGOS.zai,
    description: 'GLM-4 foundation reasoning models with low latency.'
  }
];
