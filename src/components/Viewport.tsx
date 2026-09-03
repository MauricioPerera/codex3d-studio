import React, { useRef, useEffect } from 'react';
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

    return () => {
      window.removeEventListener('resize', handleResize);
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
