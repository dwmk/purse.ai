import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { SpeechService } from '../../services/speech';
import { MarkdownContent } from './MarkdownContent';
import { LLMProvider } from '../../types/finance';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Check,
  HardDrive,
  Loader2
} from 'lucide-react';
import { MODEL_OPTIONS, MODEL_LOGOS } from '../../constants/models';
import { BrowserLMService } from '../../services/browserLm';

export const AgentChatView: React.FC = () => {
  const {
    chatMessages,
    sendMessage,
    isGenerating,
    applyAction,
    rejectAction,
    rollbackAction,
    speakingMsgId,
    speakMessage,
    isSpeechEnabled,
    toggleSpeechEnabled,
    stopSpeaking,
    is3DMode,
    accounts,
    config,
    updateConfig,
    openSettingsForProvider
  } = useFinance();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Browser LM download progress states
  const [browserLmProgress, setBrowserLmProgress] = useState<number>(0);
  const [browserLmMsg, setBrowserLmMsg] = useState<string>('');
  const [isBrowserLmDownloading, setIsBrowserLmDownloading] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isGenerating, isListening]);

  // Close model menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      SpeechService.stopSpeaking();
    };
  }, []);

  // Web Speech API: Start / Stop Voice Input
  const toggleSpeechToText = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!SpeechService.isSttSupported()) {
      alert('Speech Recognition is not supported in this browser. Please type your message.');
      return;
    }

    try {
      SpeechService.stopSpeaking();
      const recognition = SpeechService.createRecognition(
        (transcript: string) => {
          setInput(transcript);
        },
        () => {
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );

      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      }
    } catch (err) {
      console.warn('Microphone error:', err);
      setIsListening(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const text = input;
    setInput('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    await sendMessage(text);
  };



  const quickPrompts = [
    'Hey Fiona! How are my finances looking today?',
    'Can I afford a $45 dinner out tonight?',
    'Spent $42.50 at Trader Joe\'s',
    'What is my zero-income cash runway?',
    'Audit recurring subscriptions for leaks'
  ];

  const currentModel = MODEL_OPTIONS.find(m => m.id === config.provider) || MODEL_OPTIONS[0];
  const isCurrentKeyMissing = currentModel.isApiBased && !config.apiKey?.trim();

  const handleSelectModel = (opt: typeof MODEL_OPTIONS[0]) => {
    updateConfig({ provider: opt.id, model: opt.model });
    setShowModelMenu(false);

    if (opt.id === 'edge' && !BrowserLMService.checkIfCached()) {
      setIsBrowserLmDownloading(true);
      BrowserLMService.subscribe(st => {
        setBrowserLmProgress(st.progress);
        setBrowserLmMsg(st.message);
        if (st.status === 'ready') {
          setIsBrowserLmDownloading(false);
        }
      });
      BrowserLMService.startDownload();
    }
  };

  return (
    <div className={`max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col font-sans ${is3DMode ? 'h-[calc(100vh-4.25rem)] justify-end relative z-30 pointer-events-none' : 'h-[calc(100vh-4.25rem)]'}`}>
      
      {/* In 3D Mode, the conversation panel is hidden to reveal Fiona avatar at waist-height */}
      {!is3DMode && (
        <>
          {/* Messages Timeline */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {chatMessages.map(msg => {
              const isUser = msg.sender === 'user';
              const isSpeakingThis = speakingMsgId === msg.id;
              const isPlanOpen = expandedPlanId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-2xl sm:max-w-3xl lg:max-w-4xl ${isUser ? 'ml-auto' : 'mr-auto'}`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`relative group p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all ${
                      isUser
                        ? 'bg-violet-600 text-white rounded-br-xs shadow-sm'
                        : 'bg-white dark:bg-[#121216] text-zinc-900 dark:text-zinc-100 rounded-bl-xs border border-zinc-200/80 dark:border-zinc-800 shadow-xs'
                    }`}
                  >
                    {/* Properly Rendered Rich Markdown Content */}
                    <div className="leading-relaxed">
                      <MarkdownContent content={msg.content} />
                    </div>

                    {/* Agent Audio Speak Button */}
                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                        <button
                          onClick={() => speakMessage(msg.id, msg.content)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                            isSpeakingThis
                              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'animate-pulse text-violet-600' : ''}`} />
                          <span>{isSpeakingThis ? 'Speaking...' : 'Listen aloud'}</span>
                        </button>

                        {/* Step-by-Step Task Plan Accordion Toggle */}
                        {msg.plan && (
                          <button
                            onClick={() => setExpandedPlanId(isPlanOpen ? null : msg.id)}
                            className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer"
                          >
                            <span>{msg.plan.intent}</span>
                            {isPlanOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expanded Multi-Step Plan */}
                    {msg.plan && isPlanOpen && (
                      <div className="mt-2.5 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-xs space-y-1.5 animate-in fade-in duration-150">
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                          Task Plan ({(msg.plan.confidence * 100).toFixed(0)}% confidence)
                        </div>
                        {msg.plan.steps.map(s => (
                          <div key={s.step} className="flex items-start gap-2 text-[11px]">
                            <span className="text-violet-600 dark:text-violet-400 font-bold shrink-0">0{s.step}.</span>
                            <div className="leading-tight">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{s.title}: </span>
                              <span className="text-zinc-600 dark:text-zinc-400">{s.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Safe Execution Proposal Gate Card */}
                    {msg.action && (
                      <div className="mt-3.5 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>Execution Gate</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300">
                            {msg.action.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-zinc-700 dark:text-zinc-300 text-xs font-sans">
                          {msg.action.description}
                        </p>

                        {msg.action.dryRunImpact?.liquidityWarning && (
                          <div className="flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{msg.action.dryRunImpact.liquidityWarning}</span>
                          </div>
                        )}

                        {/* Action Execution Buttons */}
                        <div className="pt-1 flex items-center gap-2">
                          {msg.action.status === 'pending' && (
                            <>
                              <button
                                onClick={() => msg.action && applyAction(msg.action.id)}
                                className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-xs transition-colors tactile-btn cursor-pointer shadow-xs"
                              >
                                Approve &amp; Record
                              </button>
                              <button
                                onClick={() => msg.action && rejectAction(msg.action.id)}
                                className="px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Dismiss
                              </button>
                            </>
                          )}

                          {msg.action.status === 'applied' && (
                            <div className="flex items-center justify-between w-full pt-1">
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Committed to Browser Storage</span>
                              </span>
                              <button
                                onClick={() => msg.action && rollbackAction(msg.action.id)}
                                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer font-medium"
                              >
                                <RotateCcw className="w-3 h-3 text-zinc-400" />
                                <span>Undo Action</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Persistent Memory Revision Notification */}
                    {msg.memoryUpdateNote && (
                      <div className="mt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        <span>Memory Synced: {msg.memoryUpdateNote}</span>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 py-1 pl-2">
                <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                <span>Purse is reasoning &amp; verifying invariants...</span>
              </div>
            )}

            {/* Active Speech Recognition Pulse Bar */}
            {isListening && (
              <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 h-5">
                    <span className="w-1 bg-violet-600 rounded-full audio-bar-1" />
                    <span className="w-1 bg-violet-500 rounded-full audio-bar-2" />
                    <span className="w-1 bg-violet-400 rounded-full audio-bar-3" />
                    <span className="w-1 bg-violet-300 rounded-full audio-bar-4" />
                    <span className="w-1 bg-violet-600 rounded-full audio-bar-5" />
                  </div>
                  <div className="text-xs font-mono text-violet-800 dark:text-violet-200">
                    <span className="font-bold">Listening...</span> Speak into your microphone
                  </div>
                </div>
                <button
                  onClick={toggleSpeechToText}
                  className="text-xs font-mono px-3 py-1 bg-violet-600 text-white rounded-lg cursor-pointer hover:bg-violet-700"
                >
                  Done
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Strip */}
          <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            {quickPrompts.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[11px] font-mono px-3.5 py-1.5 bg-white dark:bg-[#121216] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Chat Input Panel with Drop-up Model Selector on Left, Mic beside Send on Right */}
      <form onSubmit={handleSend} className={`shrink-0 relative pointer-events-auto ${is3DMode ? 'max-w-2xl mx-auto w-full pb-2' : 'pt-1'}`}>
        
        {/* Missing API Key Warning with Fix Button */}
        {isCurrentKeyMissing && (
          <div className="mb-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between text-xs font-mono text-rose-700 dark:text-rose-300 shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate">Missing API key for {currentModel.name}.</span>
            </div>
            <button
              type="button"
              onClick={() => openSettingsForProvider(config.provider)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shrink-0 transition-colors shadow-xs"
            >
              Fix in Settings
            </button>
          </div>
        )}

        {/* Browser LM Download Progress Bar */}
        {config.provider === 'edge' && isBrowserLmDownloading && (
          <div className="mb-2 p-3 bg-white dark:bg-[#121216] border border-violet-500/30 rounded-2xl space-y-1.5 font-mono text-xs shadow-md animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{browserLmMsg || 'Downloading neural model weights...'}</span>
              </span>
              <span className="font-bold">{browserLmProgress}%</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-violet-600 h-full transition-all duration-150 rounded-full"
                style={{ width: `${browserLmProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 block">
              Model will be saved in browser CacheStorage for persistent instant preloading.
            </span>
          </div>
        )}

        {/* Model Drop-up Menu with Provider Logos */}
        {showModelMenu && (
          <div
            ref={modelMenuRef}
            className="absolute bottom-16 left-0 z-50 w-72 p-2 bg-white dark:bg-[#121216] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl font-mono text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Select AI Reasoning Engine
            </div>
            {MODEL_OPTIONS.map(opt => {
              const isSelected = config.provider === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handleSelectModel(opt)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white font-bold shadow-xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {opt.logo ? (
                      <img
                        src={opt.logo}
                        alt={opt.name}
                        className="w-6 h-6 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800 text-violet-500 flex items-center justify-center shrink-0">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs truncate">{opt.name}</div>
                      <div className="text-[10px] opacity-75 truncate">{opt.tag}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#121216] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md focus-within:border-violet-500 transition-all">
          
          {/* 1. Model Selector Button (Left Side, Opens Drop-up) with Logo */}
          <button
            type="button"
            onClick={() => setShowModelMenu(!showModelMenu)}
            title="Choose AI Model"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-400 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors cursor-pointer shrink-0"
          >
            {currentModel.logo ? (
              <img
                src={currentModel.logo}
                alt={currentModel.name}
                className="w-4 h-4 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
              />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
            )}
            <span className="hidden sm:inline font-semibold">{currentModel.name.split(' ')[0]}</span>
            <ChevronUp className="w-3 h-3 text-zinc-400" />
          </button>

          {/* 2. Text Input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Listening to your speech...' : 'Type or speak: "Spent $35 on groceries"...'}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none min-w-0 font-medium"
            disabled={isGenerating}
          />

          {/* 3. Mic Icon (Beside the Send Button) */}
          <button
            type="button"
            onClick={toggleSpeechToText}
            title={isListening ? 'Stop listening' : 'Speak into mic'}
            className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* 4. Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 transition-all tactile-btn cursor-pointer shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>

        </div>
      </form>

    </div>
  );
};
