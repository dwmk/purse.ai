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
    id: 'edge',
    name: 'Browser Edge (Local LLM)',
    tag: 'SmolLM2-135M (Default / Max Priority)',
    model: 'onnx-community/SmolLM2-135M-Instruct-ONNX',
    isApiBased: false,
    description: 'Runs directly in your browser with maximum priority via WebAssembly/WebGPU. 100% private.'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tag: 'gemini-3.8-flash (Cloud Engine)',
    model: 'gemini-3.8-flash',
    isApiBased: false,
    logo: MODEL_LOGOS.gemini,
    description: 'High-speed cloud analytical reasoning and deep world knowledge.'
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
