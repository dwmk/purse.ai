// Web Speech API Service: Guaranteed Female TTS, Subtitle Tracking & STT

export interface SpeechRecognitionHook {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
}

// Curated array of prioritized female voice names across Windows, macOS, iOS, Android & ChromeOS
export const FEMALE_VOICE_PACKS = [
  'fiona',
  'samantha',
  'victoria',
  'karen',
  'tessa',
  'zira',
  'ava',
  'allison',
  'susan',
  'serena',
  'stephanie',
  'zoe',
  'kate',
  'veena',
  'sangeeta',
  'moira',
  'joana',
  'google us english',
  'natural (female)',
  'microsoft zira',
  'en-us-female',
  'female'
];

export const MALE_VOICE_FILTERS = [
  'david', 'daniel', 'george', 'mark', 'richard', 'alex', 'fred',
  'oliver', 'rishi', 'tom', 'male', 'guy', 'james', 'brian'
];

// Active subtitle listener
let subtitleListeners: Array<(text: string, isSpeaking: boolean) => void> = [];

export const registerSubtitleListener = (fn: (text: string, isSpeaking: boolean) => void) => {
  subtitleListeners.push(fn);
  return () => {
    subtitleListeners = subtitleListeners.filter(l => l !== fn);
  };
};

const notifySubtitles = (text: string, isSpeaking: boolean) => {
  subtitleListeners.forEach(listener => listener(text, isSpeaking));
};

export function getFionaGreeting(): string {
  if (typeof window === 'undefined') return "Welcome to Purse!";
  const visited = localStorage.getItem('purse_fiona_visited');
  if (!visited) {
    localStorage.setItem('purse_fiona_visited', 'true');
    return "Hi, I'm Fiona. Welcome to Purse!";
  }
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    return "Good evening";
  } else {
    return "Late night, huh?";
  }
}

export const SpeechService = {
  isTtsSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  isSttSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  },

  // Pick guaranteed female voice from Web Speech API
  getGuaranteedFemaleVoice(): SpeechSynthesisVoice | null {
    if (!this.isTtsSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // 1. Direct match on curated female voice packs
    for (const femaleName of FEMALE_VOICE_PACKS) {
      const match = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        return nameLower.includes(femaleName) && !MALE_VOICE_FILTERS.some(m => nameLower.includes(m));
      });
      if (match) return match;
    }

    // 2. Fallback: Any English voice that does not match male identifiers
    const englishFemaleFallback = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const isEnglish = v.lang.startsWith('en');
      const isMale = MALE_VOICE_FILTERS.some(m => nameLower.includes(m));
      return isEnglish && !isMale;
    });

    if (englishFemaleFallback) return englishFemaleFallback;

    // 3. Fallback to first voice
    return voices[0] || null;
  },

  speak(text: string, onEnd?: () => void, onWord?: (word: string) => void, showSubtitles: boolean = true): void {
    if (!this.isTtsSupported()) return;
    try {
      window.speechSynthesis.cancel(); // Stop any previous speech

      // Clean markdown formatting for clean audio utterance
      const cleanText = text
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/>\s+/g, '')
        .replace(/[-*+]\s+/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) {
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.15; // Slightly higher pitch appropriate for natural female timbre

      // Assign guaranteed female voice
      const femaleVoice = this.getGuaranteedFemaleVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Initial subtitle broadcast (if enabled)
      notifySubtitles(showSubtitles ? cleanText : '', true);

      // Real-time boundary event to track progress of spoken text
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const spokenSoFar = cleanText.substring(0, event.charIndex + (event.charLength || 6));
          if (showSubtitles) {
            notifySubtitles(spokenSoFar, true);
          }
          if (onWord) onWord(spokenSoFar);
        }
      };

      const finishHandler = () => {
        notifySubtitles('', false);
        if (onEnd) onEnd();
      };

      utterance.onend = finishHandler;
      utterance.onerror = finishHandler;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      notifySubtitles('', false);
      if (onEnd) onEnd();
    }
  },

  stopSpeaking(): void {
    if (this.isTtsSupported()) {
      window.speechSynthesis.cancel();
      notifySubtitles('', false);
    }
  },

  isSpeaking(): boolean {
    return this.isTtsSupported() && window.speechSynthesis.speaking;
  },

  // Create STT Recognition instance
  createRecognition(
    onResult: (text: string) => void,
    onEnd: () => void,
    onError: (err: string) => void
  ): any {
    if (!this.isSttSupported()) return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      onError(event.error);
    };

    recognition.onend = () => {
      onEnd();
    };

    return recognition;
  }
};
