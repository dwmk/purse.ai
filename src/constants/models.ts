import { LLMProvider } from '../types/finance';

export const MODEL_LOGOS: Record<string, string> = {
  gemini: 'https://ai.mux8.com/logos/gemini.jpg',
  openai: 'https://ai.mux8.com/logos/openai.jpg',
  zai: 'https://ai.mux8.com/logos/zai.jpg',
  deepseek: 'https://ai.mux8.com/logos/deepseek.jpg',
  claude: 'https://ai.mux8.com/logos/claude.jpg',
  qwen: 'https://ai.mux8.com/logos/qwen.jpg',
  groq: 'https://ai.mux8.com/logos/groq.jpg',
  huggingface: 'https://ai.mux8.com/logos/huggingface.jpg'
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
    isApiBased: true,
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
    id: 'claude',
    name: 'Claude',
    tag: 'claude-3-5-sonnet',
    model: 'claude-3-5-sonnet-20241022',
    isApiBased: true,
    logo: MODEL_LOGOS.claude,
    description: 'Anthropic Claude reasoning engine with deep analytical and financial comprehension.'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    tag: 'deepseek-chat (V3)',
    model: 'deepseek-chat',
    isApiBased: true,
    logo: MODEL_LOGOS.deepseek,
    description: 'DeepSeek-V3 conversational engine with fast token throughput.'
  },
  {
    id: 'qwen',
    name: 'Qwen',
    tag: 'qwen-turbo / qwen-2.5',
    model: 'qwen-turbo',
    isApiBased: true,
    logo: MODEL_LOGOS.qwen,
    description: 'Alibaba Cloud Qwen foundation language and financial reasoning model.'
  },
  {
    id: 'groq',
    name: 'Groq',
    tag: 'llama-3.3-70b-versatile',
    model: 'llama-3.3-70b-versatile',
    isApiBased: true,
    logo: MODEL_LOGOS.groq,
    description: 'Ultra-fast low-latency inference powered by Groq LPU processing architecture.'
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    tag: 'meta-llama/Llama-3.1-70B-Instruct',
    model: 'meta-llama/Llama-3.1-70B-Instruct',
    isApiBased: true,
    logo: MODEL_LOGOS.huggingface,
    description: 'Serverless inference across open-weights state-of-the-art models.'
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
