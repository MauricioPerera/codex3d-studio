import React, { useState } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { SceneObjectMeta, MaterialPreset } from '../engine/types';
import { 
  X, 
  Trash2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Layers, 
  ArrowDownToLine, 
  Crosshair,
  Sliders
} from 'lucide-react';

interface SceneHierarchyDrawerProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SceneHierarchyDrawer: React.FC<SceneHierarchyDrawerProps> = ({
  engine,
  isOpen,
  onClose
}) => {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  if (!isOpen || !engine) return null;

  const inspection = engine.inspectScene();
  const selectedObjMeta = inspection.objects.find(o => o.id === selectedObjectId);
  const materialPresets = engine.materials.getPresetsList();

  const handleSelect = (id: string) => {
    setSelectedObjectId(prev => (prev === id ? null : id));
  };

  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const mesh = engine.meshes.getObjectById(id);
    if (mesh) {
      mesh.visible = !mesh.visible;
      engine.notifyChange();
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    engine.meshes.deleteObject(id);
    if (selectedObjectId === id) setSelectedObjectId(null);
    engine.notifyChange();
  };

  const handleApplyPreset = (preset: MaterialPreset) => {
    if (!selectedObjectId) return;
    const mesh = engine.meshes.getObjectById(selectedObjectId);
    if (mesh) {
      engine.materials.applyToMesh(mesh, {}, preset);
      engine.notifyChange();
    }
  };

  const handleAlignGround = () => {
    if (!selectedObjectId) return;
    engine.meshes.modifyTransform({
      objectId: selectedObjectId,
      transform: { alignToGround: true }
    });
    engine.notifyChange();
  };

  const handleCenterOrigin = () => {
    if (!selectedObjectId) return;
    engine.meshes.modifyTransform({
      objectId: selectedObjectId,
      transform: { centerOrigin: true }
    });
    engine.notifyChange();
  };

  return (
    <div className="absolute top-16 right-4 bottom-20 w-80 glass-panel rounded-2xl p-4 flex flex-col z-20 border border-white/10 shadow-2xl text-xs backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Scene Hierarchy</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            {inspection.objectCount} items
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 my-3 p-2 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] font-mono">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Polygons</span>
          <span className="text-slate-200 font-medium">{inspection.totalPolyCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Vertices</span>
          <span className="text-slate-200 font-medium">{inspection.totalVertexCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0">
        {inspection.objects.length === 0 ? (
          <div className="text-center py-10 text-slate-500 italic">
            No objects in scene.<br/>
            Codex will spawn or edit assets.
          </div>
        ) : (
          inspection.objects.map(obj => {
            const isSelected = obj.id === selectedObjectId;
            return (
              <div
                key={obj.id}
                onClick={() => handleSelect(obj.id)}
                className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-500/40 text-white'
                    : 'bg-slate-900/40 hover:bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate max-w-[140px]">{obj.name}</span>
                  <div className="flex items-center gap-1.5">
                    {obj.materialColor && (
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: obj.materialColor }}
                        title={obj.materialName || 'Material'}
                      />
                    )}
                    <button
                      onClick={(e) => handleToggleVisibility(obj.id, e)}
                      className="p-1 hover:text-white text-slate-400"
                    >
                      {obj.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
                    </button>
                    <button
                      onClick={(e) => handleDelete(obj.id, e)}
                      className="p-1 hover:text-rose-400 text-slate-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                  <span>{obj.polyCount} tris</span>
                  <span>•</span>
                  <span>{obj.type}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Object Inspector */}
      {selectedObjMeta && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Quick Material & Align
            </span>
          </div>

          {/* Quick align actions */}
          <div className="flex gap-1.5">
            <button
              onClick={handleAlignGround}
              className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1 px-2 rounded-lg text-[10px] text-slate-200 transition-colors"
            >
              <ArrowDownToLine className="w-3 h-3 text-emerald-400" />
              Align Ground
            </button>
            <button
              onClick={handleCenterOrigin}
              className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1 px-2 rounded-lg text-[10px] text-slate-200 transition-colors"
            >
              <Crosshair className="w-3 h-3 text-sky-400" />
              Center Origin
            </button>
          </div>

          {/* Preset Material Swatches */}
          <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto pr-1">
            {materialPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                title={preset.label}
                className="flex flex-col items-center p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors border border-white/5 text-[9px] text-slate-300"
              >
                <span
                  className="w-4 h-4 rounded-full mb-0.5 border border-white/20 shadow"
                  style={{ backgroundColor: preset.color }}
                />
                <span className="truncate w-full text-center">{preset.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
