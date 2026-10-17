import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { retargetAnimation } from 'vrm-mixamo-retarget';
import { useFinance } from '../../context/FinanceContext';
import { RotateCcw, Maximize2, Loader2, Sparkles } from 'lucide-react';

const VRM_MODEL_URL = '/model.vrm';
const MIXAMO_ANIM_URL = '/idle.fbx';

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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<string>('Initializing Fiona 3D...');
  const [hasError, setHasError] = useState<boolean>(false);

  // Three.js instances stored in refs to avoid React rerender churn
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Rotation interaction state
  const isDraggingRef = useRef<boolean>(false);
  const pointerStartXRef = useRef<number>(0);
  const targetRotationYRef = useRef<number>(0);
  const currentRotationYRef = useRef<number>(0);

  const isChatView = currentView === 'chat';
  const isVisible = is3DMode && currentView !== 'landing';

  // Initialize Three.js Scene, Camera, Studio Lighting & Loaders
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Perspective Camera configured for waist-up portraiture
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20.0);
    camera.position.set(0, 1.25, 1.35);
    camera.lookAt(0, 1.18, 0);
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
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // Studio Environment map using PMREMGenerator & RoomEnvironment (Three.js Skill standard)
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

    // 3-Point Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.9);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(1.5, 2.5, 2.0);
    scene.add(keyLight);

    // Cool Rim Light
    const rimLight = new THREE.DirectionalLight(0xddeeff, 1.5);
    rimLight.position.set(-1.5, 2.2, -1.8);
    scene.add(rimLight);

    // Soft Front Fill Light
    const fillLight = new THREE.DirectionalLight(0xf8eeff, 0.9);
    fillLight.position.set(-1.0, 1.5, 1.5);
    scene.add(fillLight);

    // GLTF / VRM Loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.register(parser => new VRMLoaderPlugin(parser));

    setLoadProgress('Loading Fiona VRM...');

    gltfLoader.load(
      VRM_MODEL_URL,
      gltf => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

        vrmRef.current = vrm;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Position Fiona grounded facing directly towards viewer
        vrm.scene.rotation.y = 0;
        vrm.scene.position.set(0, 0, 0);
        scene.add(vrm.scene);

        // Load Mixamo Idle Animation and retarget
        setLoadProgress('Retargeting Mixamo Animation...');
        const fbxLoader = new FBXLoader();
        fbxLoader.load(
          MIXAMO_ANIM_URL,
          fbx => {
            try {
              const clip = retargetAnimation(fbx, vrm, {
                animationClipName: fbx.animations[0]?.name || 'mixamo.com'
              });

              if (clip) {
                const mixer = new THREE.AnimationMixer(vrm.scene);
                const action = mixer.clipAction(clip);
                action.play();
                mixerRef.current = mixer;
              }
            } catch (animErr) {
              console.warn('Mixamo retarget notice:', animErr);
            } finally {
              setIsLoading(false);
            }
          },
          undefined,
          fbxErr => {
            console.warn('FBX animation fallback:', fbxErr);
            setIsLoading(false);
          }
        );
      },
      progress => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadProgress(`Loading Fiona: ${percent}%`);
        }
      },
      err => {
        console.error('VRM load error:', err);
        setHasError(true);
        setIsLoading(false);
      }
    );

    // Render & Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      // Smooth damping back to 0 (frontal angle) when pointer is released
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

        // Lip sync & expression updates
        if (vrmRef.current.expressionManager) {
          if (isAvatarSpeaking) {
            // Natural mouth oscillation while speaking
            const mouthA = (Math.sin(elapsed * 14) + 1) * 0.35 + 0.1;
            const mouthI = (Math.cos(elapsed * 11) + 1) * 0.2;
            vrmRef.current.expressionManager.setValue('aa', mouthA);
            vrmRef.current.expressionManager.setValue('ih', mouthI);
          } else {
            vrmRef.current.expressionManager.setValue('aa', 0);
            vrmRef.current.expressionManager.setValue('ih', 0);
          }

          // Natural realistic blinking every ~4 seconds
          const blinkCycle = elapsed % 4.2;
          if (blinkCycle < 0.14) {
            vrmRef.current.expressionManager.setValue('blink', 1.0);
          } else {
            vrmRef.current.expressionManager.setValue('blink', 0.0);
          }

          vrmRef.current.expressionManager.update();
        }

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
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
      }
    };
  }, []);

  // Update canvas sizing and camera framing when switching between full waist-height view and PIP
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth || 300;
      const height = containerRef.current.clientHeight || 400;

      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;

      // Waist-height portrait framing
      if (isChatView) {
        cameraRef.current.position.set(0, 1.25, width < 640 ? 1.45 : 1.28);
        cameraRef.current.lookAt(0, 1.18, 0);
      } else {
        // PIP mode (smaller portrait in corner)
        cameraRef.current.position.set(0, 1.25, 1.35);
        cameraRef.current.lookAt(0, 1.18, 0);
      }

      cameraRef.current.updateProjectionMatrix();
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [isChatView, isVisible]);

  // Pointer event handlers: allow dragging horizontally to rotate, then spring back on release
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    pointerStartXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - pointerStartXRef.current;
    pointerStartXRef.current = e.clientX;
    targetRotationYRef.current += deltaX * 0.012;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    targetRotationYRef.current = 0; // Springs back to facing viewer
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 3D Model Viewport Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`transition-all duration-300 ease-out select-none ${
          isChatView
            ? 'fixed inset-0 top-14 pb-16 z-20 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing'
            : 'fixed bottom-16 sm:bottom-6 left-4 sm:left-6 w-44 h-64 sm:w-56 sm:h-80 z-30 pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-105 transition-transform'
        }`}
        title="Fiona 3D Companion · Drag to rotate (releases to center)"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-transparent"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-mono text-violet-600 dark:text-violet-400 pointer-events-none p-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-violet-600 dark:text-violet-400" />
            <span className="font-semibold text-xs">{loadProgress}</span>
          </div>
        )}

        {/* Error Fallback Notice */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-mono text-rose-500 pointer-events-none p-4 text-center">
            <span>Unable to load 3D model</span>
          </div>
        )}

        {/* Floating PIP Back-to-Chat Button (Only when in non-chat views) */}
        {!isChatView && !isLoading && (
          <button
            onClick={() => setCurrentView('chat')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-violet-600 dark:text-violet-400 shadow-md border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer opacity-80 hover:opacity-100"
            title="Expand to Full Copilot Chat View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Rotation Hint Overlay in Full View */}
        {isChatView && !isLoading && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 pointer-events-none shadow-sm flex items-center gap-1.5 opacity-80">
            <RotateCcw className="w-3 h-3 text-violet-500" />
            <span>Drag to rotate · Releases to center</span>
          </div>
        )}
      </div>

      {/* Real-time Subtitles Floating Banner */}
      {activeSubtitle && isVisible && (
        <div className="fixed bottom-20 sm:bottom-16 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-zinc-950/90 dark:bg-zinc-900/95 text-white px-5 py-3.5 rounded-2xl border border-violet-500/40 shadow-2xl backdrop-blur-md text-center text-xs sm:text-sm font-sans font-medium leading-relaxed">
            <div className="text-[10px] font-mono text-violet-300 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span>Fiona</span>
            </div>
            <p className="text-balance leading-normal">{activeSubtitle}</p>
          </div>
        </div>
      )}
    </>
  );
};
