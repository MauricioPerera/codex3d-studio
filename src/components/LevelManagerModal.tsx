import React, { useState, useEffect } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { LevelPackage } from '../game/LevelSerializer';
import { 
  FolderDown, 
  Save, 
  X, 
  Download, 
  Upload, 
  Trash2, 
  Play, 
  Edit3, 
  Sparkles, 
  Clock, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';

interface LevelManagerModalProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LevelManagerModal: React.FC<LevelManagerModalProps> = ({
  engine,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'library' | 'import'>('library');
  const [levelTitle, setLevelTitle] = useState('');
  const [savedLevels, setSavedLevels] = useState<LevelPackage[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !engine) return;
    refreshLibrary();
  }, [isOpen, engine]);

  if (!isOpen || !engine) return null;

  const refreshLibrary = () => {
    const list = engine.levelSerializer.listStorage();
    setSavedLevels(list);
    if (list.length === 0) {
      setActiveTab('save');
    }
  };

  const handleSaveToStorage = () => {
    const title = levelTitle.trim() || `Mi Nivel ${savedLevels.length + 1}`;
    const pkg = engine.levelSerializer.serialize(title);
    engine.levelSerializer.saveToStorage(pkg);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      refreshLibrary();
      setActiveTab('library');
    }, 800);
  };

  const handleDownloadJSON = () => {
    const title = levelTitle.trim() || 'Mi_Nivel_Codex3D';
    const pkg = engine.levelSerializer.serialize(title);
    engine.levelSerializer.downloadJSON(pkg);
  };

  const handleLoadLevel = (pkg: LevelPackage, autoPlay = false) => {
    engine.levelSerializer.deserialize(pkg);
    onClose();
    if (autoPlay) {
      engine.game.setMode('play');
    }
  };

  const handleDeleteLevel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    engine.levelSerializer.deleteFromStorage(id);
    refreshLibrary();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const pkg: LevelPackage = JSON.parse(event.target?.result as string);
        if (pkg.platforms && pkg.entities) {
          engine.levelSerializer.deserialize(pkg);
          engine.levelSerializer.saveToStorage(pkg);
          refreshLibrary();
          onClose();
        }
      } catch (err) {
        alert('Archivo de nivel no válido. Asegúrate de que sea un archivo .codex3d.json');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <FolderDown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Gestor de Niveles
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">Guarda, carga y comparte tus circuitos en JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
              activeTab === 'library'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mis Niveles ({savedLevels.length})
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
              activeTab === 'save'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Guardar Actual
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
              activeTab === 'import'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Importar JSON
          </button>
        </div>

        {/* TAB 1: Library */}
        {activeTab === 'library' && (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {savedLevels.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Layers className="w-8 h-8 opacity-40" />
                <span>No tienes niveles guardados en este navegador todavía.</span>
                <button
                  onClick={() => setActiveTab('save')}
                  className="mt-2 text-amber-400 hover:underline font-medium"
                >
                  ¡Guarda tu nivel actual aquí!
                </button>
              </div>
            ) : (
              savedLevels.map((lvl) => (
                <div
                  key={lvl.id}
                  className="rounded-2xl bg-slate-900/60 border border-white/5 hover:border-amber-500/30 p-3 flex items-center justify-between transition-all group"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                      {lvl.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span>{lvl.platforms.length} bloques</span>
                      <span>•</span>
                      <span>{lvl.entities.length} entidades</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-slate-500">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(lvl.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLoadLevel(lvl, true)}
                      title="Jugar Nivel"
                      className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-400" />
                    </button>
                    <button
                      onClick={() => handleLoadLevel(lvl, false)}
                      title="Editar en Estudio"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => engine.levelSerializer.downloadJSON(lvl)}
                      title="Descargar archivo .json"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteLevel(lvl.id, e)}
                      title="Eliminar de Navegador"
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Save Current Level */}
        {activeTab === 'save' && (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                Título del Nivel
              </label>
              <input
                type="text"
                value={levelTitle}
                onChange={(e) => setLevelTitle(e.target.value)}
                placeholder="Ej: Circuito Neón Extremo"
                className="w-full rounded-2xl bg-slate-900/80 border border-white/10 focus:border-amber-500/50 px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all font-sans"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 flex items-center justify-between font-mono">
              <span>Elementos detectados:</span>
              <span className="text-amber-400 font-bold">
                {engine.meshes.getObjects().length} bloques, {engine.game.mechanics.items.length} entidades
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveToStorage}
                disabled={saveSuccess}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>¡Nivel Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar en Navegador</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadJSON}
                title="Descargar archivo .codex3d.json para compartir"
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-white/5"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Descargar .JSON</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Import JSON */}
        {activeTab === 'import' && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-amber-500/40 rounded-3xl p-8 transition-colors text-center gap-3">
            <Upload className="w-8 h-8 text-amber-400 animate-bounce" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">
                Selecciona o arrastra un archivo .codex3d.json
              </span>
              <span className="text-[11px] text-slate-400 block">
                Carga al instante circuitos creados por amigos o generados por agentes de IA
              </span>
            </div>
            <label className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-xs border border-amber-500/40 cursor-pointer transition-all active:scale-95">
              <span>Examinar Archivos</span>
              <input
                type="file"
                accept=".json,.codex3d.json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
