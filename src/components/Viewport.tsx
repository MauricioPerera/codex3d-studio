import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { StudioEngine } from '../engine/StudioEngine';
import { registerStudioTools } from '../webmcp/tools';

interface ViewportProps {
  onEngineReady: (engine: StudioEngine) => void;
}

export const Viewport: React.FC<ViewportProps> = ({ onEngineReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<StudioEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize Studio Engine
    const engine = new StudioEngine(canvas);
    engineRef.current = engine;

    // Register all WebMCP tools
    registerStudioTools(engine);

    // Provide engine to parent
    onEngineReady(engine);

    // Load initial starter template
    const bridge = (window as any).webmcp;
    if (bridge) {
      bridge.executeTool('load_sample_template', { template: 'coffee_studio' }).catch(console.error);
    }

    // Resize observer for crisp responsive rendering
    const handleResize = () => {
      if (canvas.parentElement) {
        engine.resize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    // Object selection raycast in Edit Mode
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      if (engine.game.mode === 'play') return;
      const startX = e.clientX;
      const startY = e.clientY;

      const handlePointerUp = (upEv: PointerEvent) => {
        window.removeEventListener('pointerup', handlePointerUp);
        if (Math.hypot(upEv.clientX - startX, upEv.clientY - startY) > 5) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((upEv.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((upEv.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, engine.camera);
        const intersects = raycaster.intersectObjects(engine.scene.children, true);
        const hit = intersects.find((i: any) => {
          let cur: THREE.Object3D | null = i.object;
          while (cur && cur !== engine.scene) {
            if (cur.userData?.isStudioAsset || cur.name.startsWith('Collectible_') || cur.name.startsWith('JumpPad_') || cur.name.startsWith('MovingPlatform_') || cur.name.startsWith('Hazard_') || cur.name.startsWith('Goal_') || cur.name.startsWith('SpeedRing_') || cur.name.startsWith('Platform_')) {
              return true;
            }
            cur = cur.parent;
          }
          return false;
        });

        if (hit) {
          let target: THREE.Object3D = hit.object;
          let cur: THREE.Object3D | null = hit.object;
          while (cur && cur !== engine.scene) {
            if (cur.userData?.isStudioAsset) {
              target = cur;
              break;
            }
            cur = cur.parent;
          }
          engine.selectObject(target);
        } else {
          engine.selectObject(null);
        }
      };

      window.addEventListener('pointerup', handlePointerUp);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      observer.disconnect();
      engine.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0a0b0e] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />
    </div>
  );
};
