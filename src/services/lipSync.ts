// Autonomous LipSync & Viseme Engine for VRM Avatar
// Coordinates with Web Speech API events and procedural speech cadences

export interface Visemes {
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
}

class LipSyncManager {
  private isSpeaking: boolean = false;
  private currentWord: string = '';
  private visemes: Visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private targetVisemes: Visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private listeners: Array<(visemes: Visemes, isSpeaking: boolean) => void> = [];
  private syllablePhase: number = 0;
  private silenceTimer: number = 0;

  constructor() {
    this.reset();
  }

  public setSpeaking(speaking: boolean, initialWord?: string) {
    this.isSpeaking = speaking;
    if (initialWord) {
      this.currentWord = initialWord;
    }
    if (!speaking) {
      this.targetVisemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    }
  }

  public setWord(word: string) {
    this.currentWord = word.toLowerCase();
    this.isSpeaking = true;
    this.silenceTimer = 0;
    this.deriveTargetVisemesFromWord(this.currentWord);
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getVisemes(): Visemes {
    return this.visemes;
  }

  public reset() {
    this.isSpeaking = false;
    this.currentWord = '';
    this.visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    this.targetVisemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    this.syllablePhase = 0;
  }

  // Parse letters in spoken word to emphasize specific vowel mouths
  private deriveTargetVisemesFromWord(word: string) {
    let aa = 0;
    let ih = 0;
    let ou = 0;
    let ee = 0;
    let oh = 0;

    if (/[aáàâä]/.test(word)) aa += 0.35;
    if (/[oóòôö]/.test(word)) oh += 0.30;
    if (/[uúùûüw]/.test(word)) ou += 0.25;
    if (/[eéèêë]/.test(word)) ee += 0.28;
    if (/[iíìîïy]/.test(word)) ih += 0.24;

    // Fallback baseline mouth amplitude if consonant heavy
    if (aa === 0 && ih === 0 && ou === 0 && ee === 0 && oh === 0) {
      aa = 0.22;
      ih = 0.15;
    }

    this.targetVisemes = {
      aa: Math.min(0.35, aa),
      ih: Math.min(0.25, ih),
      ou: Math.min(0.22, ou),
      ee: Math.min(0.25, ee),
      oh: Math.min(0.28, oh)
    };
  }

  // Called inside Three.js render loop every frame
  public update(delta: number, elapsed: number) {
    if (this.isSpeaking) {
      this.silenceTimer += delta;
      // Syllable rhythmic opening/closing wave (~7.2 Hz natural speech frequency)
      this.syllablePhase += delta * 7.5;
      const wave = Math.sin(this.syllablePhase);
      const mouthMultiplier = wave > 0.15 ? Math.sin((wave - 0.15) * Math.PI * 0.6) : 0.05;

      // Calculate targets
      const tAa = this.targetVisemes.aa * mouthMultiplier + (mouthMultiplier > 0.2 ? 0.06 : 0);
      const tIh = this.targetVisemes.ih * mouthMultiplier;
      const tOu = this.targetVisemes.ou * mouthMultiplier;
      const tEe = this.targetVisemes.ee * mouthMultiplier;
      const tOh = this.targetVisemes.oh * mouthMultiplier;

      // Smooth interpolation towards target visemes
      const lerpSpeed = delta * 18.0;
      this.visemes.aa += (tAa - this.visemes.aa) * lerpSpeed;
      this.visemes.ih += (tIh - this.visemes.ih) * lerpSpeed;
      this.visemes.ou += (tOu - this.visemes.ou) * lerpSpeed;
      this.visemes.ee += (tEe - this.visemes.ee) * lerpSpeed;
      this.visemes.oh += (tOh - this.visemes.oh) * lerpSpeed;
    } else {
      // Smooth decay back to resting lips
      const decaySpeed = delta * 14.0;
      this.visemes.aa += (0 - this.visemes.aa) * decaySpeed;
      this.visemes.ih += (0 - this.visemes.ih) * decaySpeed;
      this.visemes.ou += (0 - this.visemes.ou) * decaySpeed;
      this.visemes.ee += (0 - this.visemes.ee) * decaySpeed;
      this.visemes.oh += (0 - this.visemes.oh) * decaySpeed;

      if (Math.abs(this.visemes.aa) < 0.005) this.visemes.aa = 0;
      if (Math.abs(this.visemes.ih) < 0.005) this.visemes.ih = 0;
      if (Math.abs(this.visemes.ou) < 0.005) this.visemes.ou = 0;
      if (Math.abs(this.visemes.ee) < 0.005) this.visemes.ee = 0;
      if (Math.abs(this.visemes.oh) < 0.005) this.visemes.oh = 0;
    }
  }
}

export const lipSyncManager = new LipSyncManager();
