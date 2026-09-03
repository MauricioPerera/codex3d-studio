import React, { useState, useEffect } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { MaterialPreset } from '../engine/types';
import { 
  Sliders, 
  Trash2, 
  Copy, 
  Crosshair, 
  X, 
  Diamond, 
  Zap, 
  Flame, 
  Move, 
  Box, 
  Trophy 
} from 'lucide-react';

interface EntityInspectorProps {
  engine: StudioEngine | null;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({ engine }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!engine) return;
    const unsub = () => setTick(t => t + 1);
    engine.onStateChange(unsub);
  }, [engine]);

  if (!engine || !engine.selectedObject || engine.game.mode === 'play') {
    return null;
  }

  const obj = engine.selectedObject;

  const getEntityType = (): { label: string; icon: any; color: string } => {
    const type = obj.userData?.gameplayType;
    if (type === 'collectible' || obj.name.startsWith('Collectible_')) {
      return { label: 'Collectible Gem', icon: Diamond, color: 'text-sky-400' };
    }
    if (type === 'jump_pad' || obj.name.startsWith('JumpPad_')) {
      return { label: 'Jump Pad', icon: Zap, color: 'text-emerald-400' };
    }
    if (type === 'speed_ring' || obj.name.startsWith('SpeedRing_')) {
      return { label: 'Speed Ring', icon: Zap, color: 'text-amber-400' };
    }
    if (type === 'hazard' || obj.name.startsWith('Hazard_')) {
      return { label: 'Lava Zone', icon: Flame, color: 'text-rose-400' };
    }
    if (type === 'moving_platform' || obj.name.startsWith('MovingPlatform_')) {
      return { label: 'Moving Bridge', icon: Move, color: 'text-indigo-400' };
    }
    if (type === 'goal' || obj.name.startsWith('Goal_')) {
      return { label: 'Goal Stargate', icon: Trophy, color: 'text-amber-400' };
    }
    return { label: 'Studio Primitive', icon: Box, color: 'text-slate-300' };
  };

  const entityType = getEntityType();

  const handlePosChange = (axis: 'x' | 'y' | 'z', val: number) => {
    obj.position[axis] = val;
    engine.notifyChange();
  };

  const handleMaterialChange = (preset: MaterialPreset) => {
    if ((obj as any).isMesh) {
      const mat = engine.materials.createMaterial({}, preset);
      (obj as any).material = mat;
      obj.userData.materialPreset = preset;
      engine.notifyChange();
    }
  };

  const handleFocus = () => {
    engine.controls.target.copy(obj.position);
    engine.camera.position.set(obj.position.x + 4, obj.position.y + 3, obj.position.z + 4);
    engine.notifyChange();
  };

  const handleDuplicate = () => {
    const clone = obj.clone();
    clone.position.x += 2.0;
    clone.name = `${obj.name}_copy`;
    engine.scene.add(clone);
    engine.selectObject(clone);
    engine.notifyChange();
  };

  const handleDelete = () => {
    engine.scene.remove(obj);
    engine.game.mechanics.items = engine.game.mechanics.items.filter(i => i.mesh !== obj);
    engine.selectObject(null);
    engine.notifyChange();
  };

  const materialPresets: MaterialPreset[] = [
    'carbon_fiber',
    'matte_obsidian',
    'brushed_gold',
    'frosted_glass',
    'cyber_neon',
    'polished_chrome',
    'clay_sculpt',
    'terracotta'
  ];

  return (
    <div className="fixed top-20 right-4 z-30 w-72 glass-panel rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col gap-3.5 select-none animate-in fade-in slide-in-from-right-3 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <entityType.icon className={`w-4 h-4 ${entityType.color}`} />
          <span className="text-xs font-semibold text-white tracking-wide">
            {entityType.label}
          </span>
        </div>
        <button
          onClick={() => engine.selectObject(null)}
          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Name Field */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono uppercase text-slate-400">Object Name</label>
        <input
          type="text"
          value={obj.name}
          onChange={(e) => {
            obj.name = e.target.value;
            engine.notifyChange();
          }}
          className="bg-slate-900/70 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 font-mono"
        />
      </div>

      {/* Transform Coordinates */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-mono uppercase text-slate-400">Position (X, Y, Z)</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis} className="flex items-center rounded-xl bg-slate-900/70 border border-white/10 px-2 py-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">{axis}</span>
              <input
                type="number"
                step="0.5"
                value={Math.round(obj.position[axis] * 10) / 10}
                onChange={(e) => handlePosChange(axis, parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none text-right"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Material Preset Selector (if standard mesh) */}
      {(obj as any).isMesh && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase text-slate-400">Material Preset</label>
          <div className="grid grid-cols-2 gap-1.5">
            {materialPresets.map(preset => (
              <button
                key={preset}
                onClick={() => handleMaterialChange(preset)}
                className={`px-2 py-1 rounded-xl text-[11px] font-mono text-left transition-all truncate border ${
                  obj.userData.materialPreset === preset
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-900/50 hover:bg-white/5 text-slate-300 border-white/5'
                }`}
              >
                {preset.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Bar */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
        <button
          onClick={handleFocus}
          title="Frame in View"
          className="flex-1 py-1.5 rounded-xl bg-slate-900/60 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <Crosshair className="w-3.5 h-3.5 text-sky-400" />
          <span>Frame</span>
        </button>

        <button
          onClick={handleDuplicate}
          title="Duplicate Object"
          className="flex-1 py-1.5 rounded-xl bg-slate-900/60 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <Copy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Clone</span>
        </button>

        <button
          onClick={handleDelete}
          title="Delete Object"
          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
