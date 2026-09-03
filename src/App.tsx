import React, { useState, useCallback } from 'react';
import { StudioEngine } from './engine/StudioEngine';
import { Viewport } from './components/Viewport';
import { CodexActivityHUD } from './components/CodexActivityHUD';
import { FloatingControls } from './components/FloatingControls';
import { SceneHierarchyDrawer } from './components/SceneHierarchyDrawer';
import { WebMCPConsoleDrawer } from './components/WebMCPConsoleDrawer';
import { RenderExportModal } from './components/RenderExportModal';
import { PhotorealModal } from './components/PhotorealModal';
import { GameHUD } from './components/GameHUD';
import { EntitySpawnerBar } from './components/EntitySpawnerBar';
import { EntityInspector } from './components/EntityInspector';
import { AILevelGeneratorModal } from './components/AILevelGeneratorModal';
import { LevelManagerModal } from './components/LevelManagerModal';
import { GameState } from './game/GameManager';

export const App: React.FC = () => {
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [, setTick] = useState(0);
  const [gameState, setGameState] = useState<GameState>({
    mode: 'edit',
    status: 'ready',
    score: 0,
    lives: 3,
    gemsCollected: 0,
    totalGems: 0,
    elapsedTime: 0
  });
  const [isHierarchyOpen, setIsHierarchyOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [isPhotorealModalOpen, setIsPhotorealModalOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isLevelManagerOpen, setIsLevelManagerOpen] = useState(false);
  const [isSpawnerOpen, setIsSpawnerOpen] = useState(true);

  const handleEngineReady = useCallback((eng: StudioEngine) => {
    setEngine(eng);
    eng.onStateChange(() => {
      setTick(t => t + 1);
    });
    eng.game.onStateChange((state) => {
      setGameState(state);
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
        onOpenAIGenerator={() => setIsAIGeneratorOpen(true)}
        onOpenLevelManager={() => setIsLevelManagerOpen(true)}
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

      {/* AI Natural Language Level Generator Modal */}
      <AILevelGeneratorModal
        engine={engine}
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
      />

      {/* Save, Load and Export Level JSON Modal */}
      <LevelManagerModal
        engine={engine}
        isOpen={isLevelManagerOpen}
        onClose={() => setIsLevelManagerOpen(false)}
      />

      {/* Real-Time Play Mode Game HUD with Touch Controls */}
      <GameHUD
        engine={engine}
        gameState={gameState}
        onToggleMode={() => {
          if (!engine) return;
          const next = engine.game.mode === 'play' ? 'edit' : 'play';
          engine.game.setMode(next);
        }}
        onRestart={() => {
          if (!engine) return;
          engine.game.resetLevel();
        }}
      />

      {/* In-Editor Gameplay Entity Spawner Bar */}
      <EntitySpawnerBar
        engine={engine}
        isOpen={isSpawnerOpen}
        onClose={() => setIsSpawnerOpen(false)}
      />

      {/* In-Editor Entity Inspector & Customizer Panel */}
      <EntityInspector engine={engine} />
    </div>
  );
};
export default App;
