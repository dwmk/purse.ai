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
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Check
} from 'lucide-react';

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
    accounts,
    config,
    updateConfig,
  } = useFinance();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);

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

  const checkingBal = accounts.find(a => a.type === 'checking')?.balance || 0;
  const safeDailySpend = '74.20';

  const quickPrompts = [
    'Spent $42.50 at Trader Joe\'s',
    'Can I afford $120 dinner out tonight?',
    'What is my zero-income cash runway?',
    'Audit recurring subscriptions for leaks',
    'Add rule: emergency savings target is $16,000'
  ];

  const modelOptions: { id: LLMProvider; name: string; tag: string }[] = [
    { id: 'edge', name: 'Browser Edge (Local)', tag: 'smolLM2 / Offline' },
    { id: 'gemini', name: 'Google Gemini', tag: 'gemini-3.8-flash' },
    { id: 'openai', name: 'OpenAI', tag: 'gpt-4o-mini' },
    { id: 'deepseek', name: 'DeepSeek', tag: 'deepseek-chat' },
    { id: 'zai', name: 'Z.ai / Zhipu', tag: 'glm-4-flash' }
  ];

  const currentModelLabel = modelOptions.find(m => m.id === config.provider)?.name || 'Edge Engine';

  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col h-[calc(100vh-4.25rem)] font-sans">
      
      {/* Header Card with 5-Color System */}
      <div className="p-3.5 mb-3 rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] bg-[#F3ACB4] dark:bg-[#8A7EA4] transition-colors flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] dark:bg-[#F9BBAE] dark:text-[#8A7EA4] flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-[#B59DD1]">
              👛
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#B59DD1] ring-2 ring-[#F3ACB4] dark:ring-[#8A7EA4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#8A7EA4] dark:text-[#F9BBAE]">
                Purse Copilot
              </span>
              <span className="text-[10px] font-mono text-[#8A7EA4] dark:text-[#8A7EA4] bg-[#B59DD1] px-2 py-0.5 rounded-md border border-[#8A7EA4] font-semibold">
                {currentModelLabel}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80">
              Safe to spend: <span className="font-bold text-[#8A7EA4] dark:text-[#F9BBAE] tabular-nums">${safeDailySpend}/day</span> · Cushion: ${checkingBal.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Global Voice Readout Toggle with immediate cutoff on mute */}
        <button
          onClick={() => {
            stopSpeaking();
            toggleSpeechEnabled();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl border transition-all cursor-pointer ${
            isSpeechEnabled
              ? 'border-[#8A7EA4] dark:border-[#F9BBAE] bg-[#B59DD1] text-[#8A7EA4] font-bold'
              : 'border-[#C794B0] text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
          }`}
          title={isSpeechEnabled ? 'Voice readout active (Click to mute)' : 'Voice readout muted (Click to enable)'}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">{isSpeechEnabled ? 'Voice ON' : 'Muted'}</span>
        </button>
      </div>

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
                    ? 'bg-[#8A7EA4] text-[#F9BBAE] rounded-br-xs shadow-md'
                    : 'bg-[#F3ACB4] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] rounded-bl-xs border border-[#C794B0] dark:border-[#B59DD1] shadow-xs'
                }`}
              >
                {/* Properly Rendered Rich Markdown Content */}
                <div className="leading-relaxed">
                  <MarkdownContent content={msg.content} />
                </div>

                {/* Agent Audio Speak Button */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-[#C794B0] dark:border-[#B59DD1] flex items-center justify-between text-xs">
                    <button
                      onClick={() => speakMessage(msg.id, msg.content)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                        isSpeakingThis
                          ? 'bg-[#B59DD1] text-[#8A7EA4] font-bold'
                          : 'text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
                      }`}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'animate-pulse text-[#8A7EA4]' : ''}`} />
                      <span>{isSpeakingThis ? 'Speaking...' : 'Listen aloud'}</span>
                    </button>

                    {/* Step-by-Step Task Plan Accordion Toggle */}
                    {msg.plan && (
                      <button
                        onClick={() => setExpandedPlanId(isPlanOpen ? null : msg.id)}
                        className="flex items-center gap-1 text-[11px] font-mono text-[#8A7EA4] dark:text-[#F9BBAE] hover:underline cursor-pointer"
                      >
                        <span>{msg.plan.intent}</span>
                        {isPlanOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded Multi-Step Plan */}
                {msg.plan && isPlanOpen && (
                  <div className="mt-2.5 p-3 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#C794B0] dark:border-[#8A7EA4] font-mono text-xs space-y-1.5 animate-in fade-in duration-150">
                    <div className="text-[10px] text-[#8A7EA4] font-bold uppercase tracking-wider">
                      Task Plan ({(msg.plan.confidence * 100).toFixed(0)}% confidence)
                    </div>
                    {msg.plan.steps.map(s => (
                      <div key={s.step} className="flex items-start gap-2 text-[11px]">
                        <span className="text-[#8A7EA4] font-bold shrink-0">0{s.step}.</span>
                        <div className="leading-tight">
                          <span className="font-semibold text-[#8A7EA4]">{s.title}: </span>
                          <span className="text-[#8A7EA4]/85">{s.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Safe Execution Proposal Gate Card */}
                {msg.action && (
                  <div className="mt-3.5 p-4 bg-[#F9BBAE] dark:bg-[#B59DD1] rounded-xl border border-[#8A7EA4] font-mono text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-[#8A7EA4]">
                        <ShieldCheck className="w-4 h-4 text-[#8A7EA4]" />
                        <span>Execution Gate</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#8A7EA4] text-[#F9BBAE]">
                        {msg.action.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[#8A7EA4] text-xs font-sans">
                      {msg.action.description}
                    </p>

                    {msg.action.dryRunImpact?.liquidityWarning && (
                      <div className="flex items-center gap-1.5 p-2 bg-[#F3ACB4] border border-[#8A7EA4] rounded-lg text-[11px] text-[#8A7EA4] font-bold">
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
                            className="flex-1 py-2 bg-[#8A7EA4] text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] font-semibold rounded-lg text-xs transition-colors tactile-btn cursor-pointer shadow-xs"
                          >
                            Approve &amp; Record
                          </button>
                          <button
                            onClick={() => msg.action && rejectAction(msg.action.id)}
                            className="px-3.5 py-2 border border-[#8A7EA4] text-[#8A7EA4] hover:bg-[#F3ACB4] rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </>
                      )}

                      {msg.action.status === 'applied' && (
                        <div className="flex items-center justify-between w-full pt-1">
                          <span className="text-[11px] text-[#8A7EA4] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Committed to Browser Storage</span>
                          </span>
                          <button
                            onClick={() => msg.action && rollbackAction(msg.action.id)}
                            className="flex items-center gap-1 text-[11px] text-[#8A7EA4] underline cursor-pointer font-bold"
                          >
                            <RotateCcw className="w-3 h-3 text-[#8A7EA4]" />
                            <span>Undo Action</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Persistent Memory Revision Notification */}
                {msg.memoryUpdateNote && (
                  <div className="mt-2 text-[11px] font-mono text-[#8A7EA4]/80 dark:text-[#F9BBAE]/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A7EA4] dark:bg-[#F9BBAE]" />
                    <span>Memory Synced: {msg.memoryUpdateNote}</span>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#8A7EA4] dark:text-[#F9BBAE] py-1 pl-2">
            <span className="w-2 h-2 rounded-full bg-[#8A7EA4] animate-pulse" />
            <span>Purse is reasoning &amp; verifying invariants...</span>
          </div>
        )}

        {/* Active Speech Recognition Pulse Bar */}
        {isListening && (
          <div className="p-3 bg-[#F3ACB4] border border-[#8A7EA4] rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 h-5">
                <span className="w-1 bg-[#8A7EA4] rounded-full audio-bar-1" />
                <span className="w-1 bg-[#B59DD1] rounded-full audio-bar-2" />
                <span className="w-1 bg-[#C794B0] rounded-full audio-bar-3" />
                <span className="w-1 bg-[#F3ACB4] rounded-full audio-bar-4" />
                <span className="w-1 bg-[#F9BBAE] rounded-full audio-bar-5" />
              </div>
              <div className="text-xs font-mono text-[#8A7EA4]">
                <span className="font-bold text-[#8A7EA4]">Listening...</span> Speak into your microphone
              </div>
            </div>
            <button
              onClick={toggleSpeechToText}
              className="text-xs font-mono px-3 py-1 bg-[#8A7EA4] text-[#F9BBAE] rounded-lg cursor-pointer hover:bg-[#B59DD1] hover:text-[#8A7EA4]"
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
            className="text-[11px] font-mono px-3.5 py-1.5 bg-[#F3ACB4] dark:bg-[#8A7EA4] text-[#8A7EA4] dark:text-[#F9BBAE] border border-[#C794B0] dark:border-[#B59DD1] hover:bg-[#B59DD1] hover:text-[#8A7EA4] rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Input Panel with Drop-up Model Selector on Left, Mic beside Send on Right */}
      <form onSubmit={handleSend} className="pt-1 shrink-0 relative">
        
        {/* Model Drop-up Menu */}
        {showModelMenu && (
          <div
            ref={modelMenuRef}
            className="absolute bottom-16 left-0 z-50 w-64 p-2 bg-[#F3ACB4] dark:bg-[#8A7EA4] rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] shadow-2xl font-mono text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A7EA4] dark:text-[#F9BBAE]">
              Select AI Reasoning Engine
            </div>
            {modelOptions.map(opt => {
              const isSelected = config.provider === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => {
                    updateConfig({ provider: opt.id, model: opt.tag.includes('/') ? 'smolLM2-360M-instruct' : opt.tag });
                    setShowModelMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#8A7EA4] text-[#F9BBAE] font-bold shadow-xs'
                      : 'hover:bg-[#B59DD1]/40 text-[#8A7EA4] dark:text-[#F9BBAE]'
                  }`}
                >
                  <div>
                    <div className="text-xs">{opt.name}</div>
                    <div className="text-[10px] opacity-75">{opt.tag}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 p-1.5 bg-[#F3ACB4] dark:bg-[#8A7EA4] rounded-2xl border border-[#C794B0] dark:border-[#B59DD1] shadow-md focus-within:border-[#8A7EA4] transition-all">
          
          {/* 1. Model Selector Button (Left Side, Opens Drop-up) */}
          <button
            type="button"
            onClick={() => setShowModelMenu(!showModelMenu)}
            title="Choose AI Model"
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[#C794B0] dark:border-[#B59DD1] hover:border-[#8A7EA4] text-[11px] font-mono text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40 transition-colors cursor-pointer shrink-0"
          >
            <Cpu className="w-3.5 h-3.5 text-[#8A7EA4] dark:text-[#F9BBAE]" />
            <span className="hidden sm:inline font-semibold">{currentModelLabel.split(' ')[0]}</span>
            <ChevronUp className="w-3 h-3 text-[#8A7EA4] dark:text-[#F9BBAE]" />
          </button>

          {/* 2. Text Input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Listening to your speech...' : 'Type or speak: "Spent $35 on groceries"...'}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-[#8A7EA4] dark:text-[#F9BBAE] placeholder-[#8A7EA4]/60 dark:placeholder-[#F9BBAE]/60 focus:outline-none min-w-0 font-medium"
            disabled={isGenerating}
          />

          {/* 3. Mic Icon (Beside the Send Button) */}
          <button
            type="button"
            onClick={toggleSpeechToText}
            title={isListening ? 'Stop listening' : 'Speak into mic'}
            className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-[#8A7EA4] text-[#F9BBAE] animate-pulse ring-2 ring-[#B59DD1]'
                : 'text-[#8A7EA4] dark:text-[#F9BBAE] hover:bg-[#B59DD1]/40'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* 4. Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="p-2.5 rounded-xl bg-[#8A7EA4] text-[#F9BBAE] hover:bg-[#B59DD1] hover:text-[#8A7EA4] disabled:opacity-30 transition-all tactile-btn cursor-pointer shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>

        </div>
      </form>

    </div>
  );
};
