import React from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { Diamond, Zap, Flame, Move, Box, Trophy, Plus } from 'lucide-react';

interface EntitySpawnerBarProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EntitySpawnerBar: React.FC<EntitySpawnerBarProps> = ({
  engine,
  isOpen,
  onClose
}) => {
  if (!isOpen || !engine || engine.game.mode === 'play') return null;

  const getSpawnPos = (): [number, number, number] => {
    // Drop entity right in front of camera / target
    const target = engine.controls.target;
    return [
      Math.round(target.x * 10) / 10,
      Math.round((target.y + 1.0) * 10) / 10,
      Math.round(target.z * 10) / 10
    ];
  };

  const handleSpawnGem = () => {
    const pos = getSpawnPos();
    engine.game.mechanics.spawnCollectible(pos, 100);
    engine.game.audio.playCollect();
    engine.notifyChange();
  };

  const handleSpawnJumpPad = () => {
    const pos = getSpawnPos();
    engine.game.mechanics.spawnJumpPad(pos, 22);
    engine.game.audio.playBooster();
    engine.notifyChange();
  };

  const handleSpawnLava = () => {
    const pos = getSpawnPos();
    engine.game.mechanics.spawnHazard([pos[0], pos[1] - 0.5, pos[2]], [4, 0.4, 4]);
    engine.game.audio.playHazard();
    engine.notifyChange();
  };

  const handleSpawnPlatform = () => {
    const pos = getSpawnPos();
    engine.meshes.createPrimitive({
      type: 'box',
      name: `Platform_${Date.now()}`,
      dimensions: { width: 3.0, height: 0.6, depth: 3.0 },
      position: pos,
      materialPreset: 'carbon_fiber'
    });
    engine.notifyChange();
  };

  const handleSpawnMovingPlatform = () => {
    const pos = getSpawnPos();
    const endPos: [number, number, number] = [pos[0] + 5, pos[1], pos[2]];
    engine.game.mechanics.spawnMovingPlatform(pos, endPos, [3, 0.4, 2], 1.8);
    engine.notifyChange();
  };

  const handleSpawnGoal = () => {
    const pos = getSpawnPos();
    engine.game.mechanics.spawnGoal([pos[0], pos[1] + 1.2, pos[2]]);
    engine.game.audio.playVictory();
    engine.notifyChange();
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-2 rounded-2xl glass-panel border border-white/10 shadow-2xl select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-r border-white/10 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5 text-emerald-400" />
        <span>Entities</span>
      </div>

      {/* Gem */}
      <button
        onClick={handleSpawnGem}
        title="Spawn Collectible Gem (+100 pts)"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-sky-500/20 text-slate-200 hover:text-sky-300 border border-white/5 hover:border-sky-500/40 text-xs font-medium transition-all active:scale-95"
      >
        <Diamond className="w-3.5 h-3.5 text-sky-400" />
        <span>Gem</span>
      </button>

      {/* Jump Pad */}
      <button
        onClick={handleSpawnJumpPad}
        title="Spawn High-Bounce Jump Pad"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/40 text-xs font-medium transition-all active:scale-95"
      >
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <span>Jump Pad</span>
      </button>

      {/* Platform */}
      <button
        onClick={handleSpawnPlatform}
        title="Spawn Solid Step Platform"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-white/10 text-slate-200 hover:text-white border border-white/5 text-xs font-medium transition-all active:scale-95"
      >
        <Box className="w-3.5 h-3.5 text-slate-300" />
        <span>Platform</span>
      </button>

      {/* Moving Platform */}
      <button
        onClick={handleSpawnMovingPlatform}
        title="Spawn Kinematic Moving Bridge"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-indigo-500/20 text-slate-200 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/40 text-xs font-medium transition-all active:scale-95"
      >
        <Move className="w-3.5 h-3.5 text-indigo-400" />
        <span>Moving Bridge</span>
      </button>

      {/* Lava Hazard */}
      <button
        onClick={handleSpawnLava}
        title="Spawn Lava Death Zone"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/5 hover:border-rose-500/40 text-xs font-medium transition-all active:scale-95"
      >
        <Flame className="w-3.5 h-3.5 text-rose-500" />
        <span>Lava Zone</span>
      </button>

      {/* Goal Stargate */}
      <button
        onClick={handleSpawnGoal}
        title="Spawn Victory Goal Portal"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/5 hover:border-amber-500/40 text-xs font-medium transition-all active:scale-95"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-400" />
        <span>Goal Portal</span>
      </button>
    </div>
  );
};
