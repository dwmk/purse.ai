import { lipSyncManager } from './lipSync';

// Comprehensive array of prioritized female voice names across Windows, macOS, iOS, Android & ChromeOS
export const FEMALE_VOICE_PACKS: string[] = [
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
  'kendra',
  'carmen',
  'alva',
  'clara',
  'lisa',
  'sarah',
  'emma',
  'helena',
  'jenny',
  'aria',
  'sonia',
  'mia',
  'ana',
  'female',
  'woman',
  'google us english (female)',
  'google uk english female',
  'google us english',
  'natural (female)',
  'microsoft zira',
  'microsoft aria',
  'microsoft jenny',
  'en-us-female',
  'en-gb-female',
  'en-au-female'
];

export const MALE_VOICE_FILTERS: string[] = [
  'david', 'daniel', 'george', 'mark', 'richard', 'alex', 'fred',
  'oliver', 'rishi', 'tom', 'male', 'guy', 'james', 'brian', 'ryan',
  'eric', 'steve', 'michael', 'paul', 'christopher', 'adam', 'benjamin',
  'matthew', 'justin', 'steven', 'john', 'carlos', 'bernard', 'arthur',
  'liam', 'noah', 'lucas', 'mason'
];

// Active subtitle listener registry
let subtitleListeners: Array<(text: string, isSpeaking: boolean) => void> = [];

export const registerSubtitleListener = (fn: (text: string, isSpeaking: boolean) => void) => {
  subtitleListeners.push(fn);
  return () => {
    subtitleListeners = subtitleListeners.filter(l => l !== fn);
  };
};

const notifySubtitles = (text: string, isSpeaking: boolean) => {
  subtitleListeners.forEach(listener => {
    try {
      listener(text, isSpeaking);
    } catch (e) {
      console.warn('Subtitle listener error:', e);
    }
  });
};

// Cache voices eagerly to handle asynchronous voice initialization in Chrome & Safari
let cachedVoices: SpeechSynthesisVoice[] = [];

const updateVoiceCache = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      cachedVoices = voices;
    }
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateVoiceCache();
  window.speechSynthesis.addEventListener('voiceschanged', updateVoiceCache);
  window.speechSynthesis.onvoiceschanged = updateVoiceCache;
}

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
    let voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // 1. Direct match against curated female voice packs, excluding any matching male keywords
    for (const femaleName of FEMALE_VOICE_PACKS) {
      const match = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        const uriLower = (v.voiceURI || '').toLowerCase();
        const hasFemaleIdentifier = nameLower.includes(femaleName) || uriLower.includes(femaleName);
        const hasMaleMarker = MALE_VOICE_FILTERS.some(m => nameLower.includes(m) || uriLower.includes(m));
        return hasFemaleIdentifier && !hasMaleMarker;
      });
      if (match) return match;
    }

    // 2. Any voice tagged with "female" or "woman" in name or lang
    const anyFemaleTagged = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const hasFemaleWord = nameLower.includes('female') || nameLower.includes('woman');
      const hasMaleMarker = MALE_VOICE_FILTERS.some(m => nameLower.includes(m));
      return hasFemaleWord && !hasMaleMarker;
    });
    if (anyFemaleTagged) return anyFemaleTagged;

    // 3. Fallback: English voice that does not match any known male names
    const englishNonMale = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const isEnglish = v.lang.startsWith('en');
      const isMale = MALE_VOICE_FILTERS.some(m => nameLower.includes(m));
      return isEnglish && !isMale;
    });
    if (englishNonMale) return englishNonMale;

    // 4. Any voice that does not match male filters
    const anyNonMale = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      return !MALE_VOICE_FILTERS.some(m => nameLower.includes(m));
    });
    if (anyNonMale) return anyNonMale;

    return voices[0] || null;
  },

  speak(
    text: string,
    onEnd?: () => void,
    onWord?: (word: string) => void,
    showSubtitles: boolean = true
  ): void {
    if (!this.isTtsSupported()) return;
    try {
      window.speechSynthesis.cancel(); // Stop any active speech

      // Clean markdown symbols, asterisks, brackets, and code tags for spoken utterance
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
      utterance.rate = 1.02; // Natural, conversational cadence
      utterance.pitch = 1.16; // Higher pitch range ensuring bright female vocal frequency

      // Assign guaranteed female voice
      const femaleVoice = this.getGuaranteedFemaleVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      const words = cleanText.split(/\s+/).filter(Boolean);
      let wordIndex = 0;
      let streamInterval: any = null;
      let hasNativeBoundary = false;

      const clearStreamer = () => {
        if (streamInterval) {
          clearInterval(streamInterval);
          streamInterval = null;
        }
      };

      // Chunk words into stable, balanced phrases of 6-8 words to eliminate elastic banding
      const PHRASE_SIZE = 7;
      const getStablePhrase = (currentIdx: number): string => {
        const phraseNum = Math.floor(currentIdx / PHRASE_SIZE);
        const start = phraseNum * PHRASE_SIZE;
        const end = Math.min(words.length, start + PHRASE_SIZE);
        // Returns the stable phrase and indicates the active word index within it
        return words.slice(start, end).join(' ');
      };

      // Real-time boundary event: highlights words within stable phrases without jitter
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          hasNativeBoundary = true;
          clearStreamer(); // Native timing active, kill synthetic timer immediately

          const prefix = cleanText.substring(0, event.charIndex + (event.charLength || 4));
          const currentCount = prefix.trim().split(/\s+/).filter(Boolean).length;
          wordIndex = Math.max(0, currentCount - 1);
          const currentWord = words[wordIndex] || '';
          lipSyncManager.setWord(currentWord);

          if (showSubtitles) {
            const stablePhrase = getStablePhrase(wordIndex);
            notifySubtitles(stablePhrase, true);
          }
          if (onWord) onWord(words[wordIndex] || '');
        }
      };

      lipSyncManager.setSpeaking(true, words[0] || '');

      // Fallback timer ticker: only runs if browser does NOT emit native word boundaries
      if (showSubtitles && words.length > 0) {
        notifySubtitles(getStablePhrase(0), true);
        const approxWordIntervalMs = 280;
        
        // Start fallback only after a delay if native boundary hasn't fired
        const fallbackTimer = setTimeout(() => {
          if (!hasNativeBoundary && words.length > 1) {
            streamInterval = setInterval(() => {
              if (wordIndex < words.length - 1) {
                wordIndex += 1;
                lipSyncManager.setWord(words[wordIndex] || '');
                const stablePhrase = getStablePhrase(wordIndex);
                notifySubtitles(stablePhrase, true);
              } else {
                clearStreamer();
              }
            }, approxWordIntervalMs);
          }
        }, 350);

        // Store reference to clear if speech ends
        (utterance as any)._fallbackTimeout = fallbackTimer;
      }

      let fadeTimeout: any = null;
      const finishHandler = () => {
        if ((utterance as any)._fallbackTimeout) {
          clearTimeout((utterance as any)._fallbackTimeout);
        }
        clearStreamer();
        lipSyncManager.setSpeaking(false);
        // Smoothly fade subtitle without snapping
        fadeTimeout = setTimeout(() => {
          notifySubtitles('', false);
        }, 600);
        if (onEnd) onEnd();
      };

      utterance.onend = finishHandler;
      utterance.onerror = finishHandler;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      lipSyncManager.setSpeaking(false);
      notifySubtitles('', false);
      if (onEnd) onEnd();
    }
  },

  stopSpeaking(): void {
    if (this.isTtsSupported()) {
      window.speechSynthesis.cancel();
      lipSyncManager.setSpeaking(false);
      notifySubtitles('', false);
    }
  },

  isSpeaking(): boolean {
    return this.isTtsSupported() && window.speechSynthesis.speaking;
  },

  // Create STT Recognition instance with continuous listening
  createRecognition(
    onResult: (text: string) => void,
    onEnd: () => void,
    onError: (err: string) => void
  ): any {
    if (!this.isSttSupported()) return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Enable continuous listening so the engine does not stop after short pauses
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        const piece = event.results[i][0]?.transcript?.trim();
        if (piece) {
          fullTranscript = fullTranscript ? `${fullTranscript} ${piece}` : piece;
        }
      }
      if (fullTranscript) {
        onResult(fullTranscript);
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
