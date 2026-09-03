import React, { useState } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { CameraPreset, LightingPreset } from '../engine/types';
import { 
  Camera, 
  RotateCw, 
  Box, 
  Sun, 
  Maximize2, 
  Download, 
  Layers,
  Sparkles,
  Play,
  Pause
} from 'lucide-react';

interface FloatingControlsProps {
  engine: StudioEngine | null;
  onOpenRenderModal: () => void;
  onOpenPhotorealModal: () => void;
  onToggleHierarchy: () => void;
  isHierarchyOpen: boolean;
  onToggleConsole: () => void;
  isConsoleOpen: boolean;
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  engine,
  onOpenRenderModal,
  onOpenPhotorealModal,
  onToggleHierarchy,
  isHierarchyOpen,
  onToggleConsole,
  isConsoleOpen
}) => {
  const [isTurntable, setIsTurntable] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);
  const [activeLighting, setActiveLighting] = useState<LightingPreset>('studio_high_key');
  const [isLightingMenuOpen, setIsLightingMenuOpen] = useState(false);

  if (!engine) return null;

  const handleCamera = (preset: CameraPreset) => {
    engine.setCameraPreset(preset);
  };

  const handleTurntable = () => {
    const newState = engine.toggleTurntable();
    setIsTurntable(newState);
  };

  const handleWireframe = () => {
    const newState = engine.toggleWireframe();
    setIsWireframe(newState);
  };

  const handleLighting = (preset: LightingPreset) => {
    engine.setLightingPreset(preset);
    setActiveLighting(preset);
    setIsLightingMenuOpen(false);
  };

  const lightingPresets: Array<{ id: LightingPreset; label: string }> = [
    { id: 'studio_high_key', label: 'Studio High Key' },
    { id: 'cinematic_noir', label: 'Cinematic Noir' },
    { id: 'cyber_sunset', label: 'Cyber Sunset' },
    { id: 'warm_editorial', label: 'Warm Editorial' },
    { id: 'minimal_clay', label: 'Minimal Clay' },
  ];

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5">
      {/* Game Mode Play / Edit Switch */}
      <button
        onClick={() => {
          const nextMode = engine.game.mode === 'play' ? 'edit' : 'play';
          engine.game.setMode(nextMode);
        }}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xl transition-all active:scale-95 border ${
          engine.game.mode === 'play'
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-amber-400/50 shadow-amber-500/20 animate-pulse'
            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white border-emerald-400/50 shadow-emerald-500/20'
        }`}
        title={engine.game.mode === 'play' ? 'Switch to Edit Mode' : 'Play Game with Physics & 3rd-Person Controller'}
      >
        {engine.game.mode === 'play' ? (
          <>
            <Pause className="w-3.5 h-3.5 fill-white" />
            <span>EDIT SCENE</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>PLAY GAME</span>
          </>
        )}
      </button>

      {/* Viewport Action Pill */}
      <div className="glass-pill px-2 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl border border-white/10 text-xs">
        {/* Frame All */}
        <button
          onClick={() => engine.frameAll()}
          title="Frame All Objects"
          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-white/10 my-auto" />

        {/* Camera Angles */}
        <button
          onClick={() => handleCamera('three_quarter')}
          title="3/4 Perspective"
          className="px-2 py-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
        >
          3/4
        </button>
        <button
          onClick={() => handleCamera('front')}
          title="Front View"
          className="px-2 py-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
        >
          Front
        </button>
        <button
          onClick={() => handleCamera('top')}
          title="Top View"
          className="px-2 py-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
        >
          Top
        </button>
        <button
          onClick={() => handleCamera('isometric')}
          title="Isometric View"
          className="px-2 py-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
        >
          Iso
        </button>

        <div className="w-[1px] h-4 bg-white/10 my-auto" />

        {/* Turntable */}
        <button
          onClick={handleTurntable}
          title="360 Turntable Mode"
          className={`p-1.5 rounded-lg transition-colors ${
            isTurntable ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${isTurntable ? 'animate-spin' : ''}`} />
        </button>

        {/* Wireframe */}
        <button
          onClick={handleWireframe}
          title="Toggle Wireframe"
          className={`p-1.5 rounded-lg transition-colors ${
            isWireframe ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
        </button>

        {/* Lighting Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLightingMenuOpen(!isLightingMenuOpen)}
            title="Studio Lighting Mood"
            className={`p-1.5 rounded-lg transition-colors ${
              isLightingMenuOpen ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>

          {isLightingMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 glass-panel rounded-xl py-1.5 shadow-2xl border border-white/10 z-30">
              <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-white/5">
                Lighting Moods
              </div>
              {lightingPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleLighting(preset.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                    activeLighting === preset.id
                      ? 'bg-sky-500/20 text-sky-300 font-medium'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {preset.label}
                  {activeLighting === preset.id && <Sparkles className="w-3 h-3 text-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-white/10 my-auto" />

        {/* AI Photoreal Depth & Conditioning Suite */}
        <button
          onClick={onOpenPhotorealModal}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3 py-1 rounded-lg font-medium transition-all shadow-md active:scale-95 border border-emerald-400/30"
          title="AI Photoreal Conditioning & Depth Suite"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          <span>AI Photoreal</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 my-auto" />

        {/* Render Snapshot & Export */}
        <button
          onClick={onOpenRenderModal}
          className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-3 py-1 rounded-lg font-medium transition-all shadow-md active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 3D</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 my-auto" />

        {/* Drawer Toggles */}
        <button
          onClick={onToggleHierarchy}
          title="Scene Hierarchy"
          className={`p-1.5 rounded-lg transition-colors ${
            isHierarchyOpen ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
