import { VRM } from '@pixiv/three-vrm';

export interface Visemes {
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
}

export class LipSyncManager {
  private isSpeaking: boolean = false;
  private currentWord: string = '';
  private visemes: Visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private targetVisemes: Visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private vrm: VRM | null = null;
  private syllablePhase: number = 0;
  private silenceTimer: number = 0;

  constructor(vrm?: VRM) {
    if (vrm) {
      this.vrm = vrm;
    }
    this.reset();
  }

  /** Attach or update the target VRM 1.0 model instance */
  public setVRM(vrm: VRM | null) {
    this.vrm = vrm;
  }

  public setSpeaking(speaking: boolean, initialWord?: string) {
    this.isSpeaking = speaking;
    if (initialWord) {
      this.setWord(initialWord);
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
    this.applyToVRM();
  }

  // Parse letters in spoken word to emphasize specific vowel mouths
  private deriveTargetVisemesFromWord(word: string) {
    let aa = 0;
    let ih = 0;
    let ou = 0;
    let ee = 0;
    let oh = 0;

    if (/[aáàâä]/.test(word)) aa += 0.40;
    if (/[oóòôö]/.test(word)) oh += 0.35;
    if (/[uúùûüw]/.test(word)) ou += 0.30;
    if (/[eéèêë]/.test(word)) ee += 0.32;
    if (/[iíìîïy]/.test(word)) ih += 0.28;

    // Fallback baseline mouth amplitude if consonant heavy
    if (aa === 0 && ih === 0 && ou === 0 && ee === 0 && oh === 0) {
      aa = 0.25;
      ih = 0.18;
    }

    this.targetVisemes = {
      aa: Math.min(0.45, aa),
      ih: Math.min(0.32, ih),
      ou: Math.min(0.30, ou),
      ee: Math.min(0.32, ee),
      oh: Math.min(0.35, oh)
    };
  }

  // Direct integration with VRM 1.0 ExpressionManager
  private applyToVRM() {
    if (!this.vrm || !this.vrm.expressionManager) return;

    const manager = this.vrm.expressionManager;
    manager.setValue('aa', this.visemes.aa);
    manager.setValue('ih', this.visemes.ih);
    manager.setValue('ou', this.visemes.ou);
    manager.setValue('ee', this.visemes.ee);
    manager.setValue('oh', this.visemes.oh);
  }

  // Called inside Three.js render loop every frame
  public update(delta: number, elapsed: number) {
    if (this.isSpeaking) {
      this.silenceTimer += delta;
      
      // Syllable rhythmic opening/closing wave (~8.0 Hz natural speech frequency)
      this.syllablePhase += delta * 8.0;
      const wave = Math.sin(this.syllablePhase);
      const mouthMultiplier = wave > 0.1 ? Math.sin((wave - 0.1) * Math.PI * 0.55) : 0.05;

      // Calculate targets
      const tAa = this.targetVisemes.aa * mouthMultiplier + (mouthMultiplier > 0.2 ? 0.08 : 0);
      const tIh = this.targetVisemes.ih * mouthMultiplier;
      const tOu = this.targetVisemes.ou * mouthMultiplier;
      const tEe = this.targetVisemes.ee * mouthMultiplier;
      const tOh = this.targetVisemes.oh * mouthMultiplier;

      // Smooth interpolation towards target visemes
      const lerpSpeed = delta * 20.0;
      this.visemes.aa += (tAa - this.visemes.aa) * lerpSpeed;
      this.visemes.ih += (tIh - this.visemes.ih) * lerpSpeed;
      this.visemes.ou += (tOu - this.visemes.ou) * lerpSpeed;
      this.visemes.ee += (tEe - this.visemes.ee) * lerpSpeed;
      this.visemes.oh += (tOh - this.visemes.oh) * lerpSpeed;
    } else {
      // Smooth decay back to resting lips
      const decaySpeed = delta * 16.0;
      this.visemes.aa += (0 - this.visemes.aa) * decaySpeed;
      this.visemes.ih += (0 - this.visemes.ih) * decaySpeed;
      this.visemes.ou += (0 - this.visemes.ou) * decaySpeed;
      this.visemes.ee += (0 - this.visemes.ee) * decaySpeed;
      this.visemes.oh += (0 - this.visemes.oh) * decaySpeed;

      if (Math.abs(this.visemes.aa) < 0.001) this.visemes.aa = 0;
      if (Math.abs(this.visemes.ih) < 0.001) this.visemes.ih = 0;
      if (Math.abs(this.visemes.ou) < 0.001) this.visemes.ou = 0;
      if (Math.abs(this.visemes.ee) < 0.001) this.visemes.ee = 0;
      if (Math.abs(this.visemes.oh) < 0.001) this.visemes.oh = 0;
    }

    // Apply computed weights directly to the VRM instance
    this.applyToVRM();
  }
}

export const lipSyncManager = new LipSyncManager();