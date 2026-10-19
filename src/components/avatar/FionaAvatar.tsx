import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { retargetAnimation } from 'vrm-mixamo-retarget';
import { useFinance } from '../../context/FinanceContext';
import { lipSyncManager } from '../../services/lipSync';
import { RotateCcw, Maximize2, Loader2, RefreshCw } from 'lucide-react';

const VRM_MODEL_URL = '/model.vrm';
const MIXAMO_ANIM_URL = '/idle.fbx';

// In-memory model cache so switching between tabs or toggling 2D/3D never re-downloads the 16MB file
let cachedGLTF: any = null;
let cachedAnimationClip: THREE.AnimationClip | null = null;

export const FionaAvatar: React.FC = () => {
  const {
    is3DMode,
    currentView,
    setCurrentView,
    activeSubtitle,
    isAvatarSpeaking,
  } = useFinance();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(!cachedGLTF);
  const [loadProgress, setLoadProgress] = useState<string>('Initializing Fiona 3D...');
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const timerRef = useRef<THREE.Timer>(new THREE.Timer());
  const isInitializedRef = useRef<boolean>(false);

  // Rotation interaction state with spring return
  const isDraggingRef = useRef<boolean>(false);
  const pointerStartXRef = useRef<number>(0);
  const totalDragDeltaRef = useRef<number>(0);
  const targetRotationYRef = useRef<number>(0);
  const currentRotationYRef = useRef<number>(0);

  const isChatView = currentView === 'chat';
  // Fiona is visible whenever 3D mode is active and not on landing
  const isVisible = is3DMode && currentView !== 'landing';

  // Sizing and camera framing helper: accurate 1:1 aspect ratio matching rendered canvas
  const updateDimensions = useCallback(() => {
    if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    rendererRef.current.setPixelRatio(pixelRatio);
    rendererRef.current.setSize(width, height, false);

    cameraRef.current.aspect = width / height;
    cameraRef.current.fov = 30;

    if (isChatView) {
      // Zoomed-out waist-length portrait framing in Chat view (framed comfortably lower)
      const isMobile = width < 640;
      cameraRef.current.position.set(0, 0.68, isMobile ? 2.35 : 2.12);
      cameraRef.current.lookAt(0, 0.68, 0);
    } else {
      // PIP mode in bottom-left corner
      cameraRef.current.position.set(0, 0.68, 2.22);
      cameraRef.current.lookAt(0, 0.68, 0);
    }

    cameraRef.current.updateProjectionMatrix();
  }, [isChatView]);

  // Main Scene & 3D Avatar Setup
  const initThreeScene = useCallback(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    isInitializedRef.current = true;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Perspective Camera setup: zoomed out waist-height framing lowered
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20.0);
    camera.position.set(0, 0.68, 2.12);
    camera.lookAt(0, 0.68, 0);
    cameraRef.current = camera;

    // WebGL Renderer with full alpha transparency
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    rendererRef.current = renderer;

    // Studio Environment lighting
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();
      roomEnv.dispose();
    } catch (e) {
      console.warn('RoomEnvironment fallback:', e);
    }

    // Warm, flattering 3-point portrait lighting to eliminate washed-out paleness
    const ambientLight = new THREE.AmbientLight(0xfff3e6, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffebe0, 0x4a3c3c, 0.55);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeedb, 1.15);
    keyLight.position.set(1.4, 2.2, 1.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffdfd2, 0.65);
    fillLight.position.set(-1.2, 1.4, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xdbe3f5, 0.65);
    rimLight.position.set(-1.4, 2.0, -1.8);
    scene.add(rimLight);

    // Initial sizing
    updateDimensions();

    // Helper to apply VRM once loaded
    const applyVRM = (vrm: VRM) => {
      vrmRef.current = vrm;
      vrm.scene.rotation.y = 0;
      // Lower model vertically so waist and torso are framed comfortably lower
      vrm.scene.position.set(0, -0.56, 0);
      scene.add(vrm.scene);

      // Dismiss loading overlay immediately: Fiona is visible in scene!
      setIsLoading(false);
      setHasError(false);
      updateDimensions();

      // If animation was already cached, play it right away
      if (cachedAnimationClip) {
        const mixer = new THREE.AnimationMixer(vrm.scene);
        const action = mixer.clipAction(cachedAnimationClip);
        action.play();
        mixerRef.current = mixer;
        return;
      }

      // Concurrently fetch and retarget Mixamo idle animation
      const fbxLoader = new FBXLoader();
      fbxLoader.load(
        MIXAMO_ANIM_URL,
        fbx => {
          try {
            const clip = retargetAnimation(fbx, vrm, {
              animationClipName: fbx.animations[0]?.name || 'mixamo.com',
              logWarnings: false
            });

            if (clip) {
              cachedAnimationClip = clip;
              const mixer = new THREE.AnimationMixer(vrm.scene);
              const action = mixer.clipAction(clip);
              action.play();
              mixerRef.current = mixer;
            }
          } catch (animErr) {
            console.warn('Mixamo animation retarget notice:', animErr);
          }
        },
        undefined,
        fbxErr => {
          console.warn('FBX animation fallback notice:', fbxErr);
        }
      );
    };

    // If GLTF is already cached, reuse
    if (cachedGLTF && cachedGLTF.userData?.vrm) {
      applyVRM(cachedGLTF.userData.vrm);
    } else {
      // Load VRM Model
      const gltfLoader = new GLTFLoader();
      gltfLoader.register(parser => new VRMLoaderPlugin(parser));

      setLoadProgress('Loading Fiona 3D...');

      gltfLoader.load(
        VRM_MODEL_URL,
        gltf => {
          const vrm = gltf.userData.vrm as VRM;
          if (!vrm) {
            setHasError(true);
            setErrorMessage('VRM data not found in model');
            setIsLoading(false);
            return;
          }

          cachedGLTF = gltf;
          try {
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.combineSkeletons(gltf.scene);
          } catch (cleanErr) {
            console.warn('VRM cleanup notice:', cleanErr);
          }

          applyVRM(vrm);
        },
        progress => {
          if (progress.total > 0) {
            const percent = Math.min(99, Math.round((progress.loaded / progress.total) * 100));
            setLoadProgress(`Loading Fiona: ${percent}%`);
          }
        },
        err => {
          console.error('VRM load error:', err);
          setHasError(true);
          setErrorMessage('Failed to load 3D assets');
          setIsLoading(false);
        }
      );
    }

    // Render & Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      timerRef.current.update();
      const delta = Math.min(timerRef.current.getDelta(), 0.1);
      const elapsed = timerRef.current.getElapsed();

      // Smooth damping back to frontal angle (0) when released
      if (!isDraggingRef.current) {
        targetRotationYRef.current = 0;
      }
      currentRotationYRef.current = THREE.MathUtils.damp(
        currentRotationYRef.current,
        targetRotationYRef.current,
        5.5,
        delta
      );

      if (vrmRef.current) {
        vrmRef.current.scene.rotation.y = currentRotationYRef.current;

        // Subtle procedural idle breathing / sway fallback
        const neckNode = vrmRef.current.humanoid?.getNormalizedBoneNode('neck');
        if (neckNode && !mixerRef.current) {
          neckNode.rotation.y = Math.sin(elapsed * 0.8) * 0.04;
          neckNode.rotation.x = Math.sin(elapsed * 1.5) * 0.02;
        }

        // Lip sync & viseme engine
        lipSyncManager.update(delta, elapsed);
        const visemes = lipSyncManager.getVisemes();
        const speakingNow = isAvatarSpeaking || lipSyncManager.getIsSpeaking();

        // Conversational head nod while speaking
        const headNode = vrmRef.current.humanoid?.getNormalizedBoneNode('head');
        if (headNode && speakingNow) {
          headNode.rotation.x = Math.sin(elapsed * 5.2) * 0.025;
        }

        const aaVal = speakingNow ? Math.min(0.38, Math.max(visemes.aa, 0.04)) : 0;
        const ihVal = speakingNow ? Math.min(0.28, visemes.ih) : 0;
        const ouVal = speakingNow ? Math.min(0.24, visemes.ou) : 0;
        const eeVal = speakingNow ? Math.min(0.28, visemes.ee) : 0;
        const ohVal = speakingNow ? Math.min(0.30, visemes.oh) : 0;

        if (vrmRef.current.expressionManager) {
          vrmRef.current.expressionManager.setValue('aa', aaVal);
          vrmRef.current.expressionManager.setValue('ih', ihVal);
          vrmRef.current.expressionManager.setValue('ou', ouVal);
          vrmRef.current.expressionManager.setValue('ee', eeVal);
          vrmRef.current.expressionManager.setValue('oh', ohVal);

          // Support VRM 0.0 blendshape keys
          try { vrmRef.current.expressionManager.setValue('a' as any, aaVal); } catch {}
          try { vrmRef.current.expressionManager.setValue('i' as any, ihVal); } catch {}
          try { vrmRef.current.expressionManager.setValue('u' as any, ouVal); } catch {}
          try { vrmRef.current.expressionManager.setValue('e' as any, eeVal); } catch {}
          try { vrmRef.current.expressionManager.setValue('o' as any, ohVal); } catch {}

          const blinkCycle = elapsed % 4.2;
          if (blinkCycle < 0.14) {
            vrmRef.current.expressionManager.setValue('blink', 1.0);
          } else {
            vrmRef.current.expressionManager.setValue('blink', 0.0);
          }

          vrmRef.current.expressionManager.update();
        }

        // Direct mesh morph target fallback for VRoid and GLTF meshes
        vrmRef.current.scene.traverse((obj) => {
          const mesh = obj as THREE.SkinnedMesh;
          if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            const dict = mesh.morphTargetDictionary;
            if (typeof dict['Fcl_MTH_A'] === 'number') mesh.morphTargetInfluences[dict['Fcl_MTH_A']] = aaVal;
            if (typeof dict['Fcl_MTH_I'] === 'number') mesh.morphTargetInfluences[dict['Fcl_MTH_I']] = ihVal;
            if (typeof dict['Fcl_MTH_U'] === 'number') mesh.morphTargetInfluences[dict['Fcl_MTH_U']] = ouVal;
            if (typeof dict['Fcl_MTH_E'] === 'number') mesh.morphTargetInfluences[dict['Fcl_MTH_E']] = eeVal;
            if (typeof dict['Fcl_MTH_O'] === 'number') mesh.morphTargetInfluences[dict['Fcl_MTH_O']] = ohVal;
            if (typeof dict['jawOpen'] === 'number') mesh.morphTargetInfluences[dict['jawOpen']] = aaVal;
            if (typeof dict['mouthOpen'] === 'number') mesh.morphTargetInfluences[dict['mouthOpen']] = aaVal;
          }
        });

        vrmRef.current.update(delta);
      }

      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [updateDimensions, isAvatarSpeaking]);

  // Initialize scene once DOM is ready
  useEffect(() => {
    initThreeScene();
  }, [initThreeScene]);

  // Update canvas sizing whenever view changes or container resizes
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    if (canvasRef.current) observer.observe(canvasRef.current);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, [updateDimensions, isVisible]);

  // Pointer event handlers: rotate on drag, spring back to center on release
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    pointerStartXRef.current = e.clientX;
    totalDragDeltaRef.current = 0;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - pointerStartXRef.current;
    pointerStartXRef.current = e.clientX;
    totalDragDeltaRef.current += Math.abs(deltaX);
    targetRotationYRef.current += deltaX * 0.012;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    targetRotationYRef.current = 0; // Springs back smoothly to facing viewer
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Tap in PIP mode returns to full Chat view
    if (!isChatView && totalDragDeltaRef.current < 6) {
      setCurrentView('chat');
    }
  };

  const handleRetry = () => {
    isInitializedRef.current = false;
    setIsLoading(true);
    setHasError(false);
    initThreeScene();
  };

  return (
    <>
      {/* 3D Model Viewport Container - Always kept mounted to avoid WebGL context drops */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className={`transition-all duration-300 ease-out select-none ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${
          isChatView
            ? 'fixed top-16 bottom-20 inset-x-0 z-20 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing'
            : 'fixed bottom-16 sm:bottom-6 left-4 sm:left-6 w-44 h-64 sm:w-56 sm:h-80 z-30 pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-105 transition-transform'
        }`}
        title={
          isChatView
            ? 'Fiona'
            : 'Fiona'
        }
      >
        <div className={`relative flex items-center justify-center ${
          isChatView
            ? 'w-full max-w-[520px] h-full max-h-[720px]'
            : 'w-full h-full'
        }`}>
          <canvas
            ref={canvasRef}
            className="w-full h-full block bg-transparent"
          />

          {/* Loading Spinner */}
          {isVisible && isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-mono text-violet-600 dark:text-violet-400 pointer-events-none p-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-violet-600 dark:text-violet-400" />
              <span className="font-semibold text-xs">{loadProgress}</span>
            </div>
          )}

          {/* Error Fallback Notice with Retry Button */}
          {isVisible && hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-mono text-rose-500 p-4 text-center bg-white/80 dark:bg-zinc-950/80 rounded-2xl">
              <span className="font-semibold">{errorMessage || 'Unable to load 3D model'}</span>
              <button
                onClick={handleRetry}
                className="mt-2 px-3 py-1 bg-violet-600 text-white rounded-lg flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-violet-700"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Floating PIP Back-to-Chat Button (Only when navigating away from chat view) */}
          {isVisible && !isChatView && !isLoading && !hasError && (
            <button
              onClick={() => setCurrentView('chat')}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-violet-600 dark:text-violet-400 shadow-md border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer opacity-85 hover:opacity-100"
              title="Expand to Full Chat View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Subtitles: Shown ONLY when 3D mode is active, rendered with stable geometry to avoid elastic banding */}
      {is3DMode && (
        <div
          className={`fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg pointer-events-none transition-all duration-200 ease-out ${
            activeSubtitle ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
          }`}
        >
          <div className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-zinc-950/90 dark:bg-zinc-900/95 text-white border border-violet-500/35 shadow-2xl backdrop-blur-md flex items-center justify-center gap-3 text-center">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <p className="text-xs sm:text-sm font-sans font-medium text-zinc-100 leading-snug tracking-normal line-clamp-2">
              {activeSubtitle}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
