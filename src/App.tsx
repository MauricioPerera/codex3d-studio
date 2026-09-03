import React, { useState, useCallback } from 'react';
import { StudioEngine } from './engine/StudioEngine';
import { Viewport } from './components/Viewport';
import { CodexActivityHUD } from './components/CodexActivityHUD';
import { FloatingControls } from './components/FloatingControls';
import { SceneHierarchyDrawer } from './components/SceneHierarchyDrawer';
import { WebMCPConsoleDrawer } from './components/WebMCPConsoleDrawer';
import { RenderExportModal } from './components/RenderExportModal';
import { PhotorealModal } from './components/PhotorealModal';

export const App: React.FC = () => {
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [, setTick] = useState(0);
  const [isHierarchyOpen, setIsHierarchyOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [isPhotorealModalOpen, setIsPhotorealModalOpen] = useState(false);

  const handleEngineReady = useCallback((eng: StudioEngine) => {
    setEngine(eng);
    eng.onStateChange(() => {
      setTick(t => t + 1);
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#0a0b0e]">
      {/* 100% Immersive 3D Viewport */}
      <Viewport onEngineReady={handleEngineReady} />

      {/* Top Left: Codex WebMCP Activity HUD */}
      <CodexActivityHUD />

      {/* Top Right: Viewport-Centric Action Controls */}
      <FloatingControls
        engine={engine}
        onOpenRenderModal={() => setIsRenderModalOpen(true)}
        onOpenPhotorealModal={() => setIsPhotorealModalOpen(true)}
        onToggleHierarchy={() => setIsHierarchyOpen(prev => !prev)}
        isHierarchyOpen={isHierarchyOpen}
        onToggleConsole={() => setIsConsoleOpen(prev => !prev)}
        isConsoleOpen={isConsoleOpen}
      />

      {/* Collapsible Scene Hierarchy & Material Inspector Drawer */}
      <SceneHierarchyDrawer
        engine={engine}
        isOpen={isHierarchyOpen}
        onClose={() => setIsHierarchyOpen(false)}
      />

      {/* Collapsible Bottom WebMCP Agent Console */}
      <WebMCPConsoleDrawer
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen(prev => !prev)}
      />

      {/* Render Snapshot & Asset Export Modal */}
      <RenderExportModal
        engine={engine}
        isOpen={isRenderModalOpen}
        onClose={() => setIsRenderModalOpen(false)}
      />

      {/* AI Photoreal Depth & Conditioning Suite Modal */}
      <PhotorealModal
        engine={engine}
        isOpen={isPhotorealModalOpen}
        onClose={() => setIsPhotorealModalOpen(false)}
      />
    </div>
  );
};
export default App;
