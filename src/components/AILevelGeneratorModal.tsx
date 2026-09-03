import React, { useState } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { GeneratedLevelMetadata } from '../game/LevelGeneratorAI';
import { 
  Wand2, 
  X, 
  Sparkles, 
  Play, 
  Layers, 
  Diamond, 
  Zap, 
  Flame, 
  CheckCircle2, 
  Sliders 
} from 'lucide-react';

interface AILevelGeneratorModalProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AILevelGeneratorModal: React.FC<AILevelGeneratorModalProps> = ({
  engine,
  isOpen,
  onClose
}) => {
  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState<'cyber_neon' | 'dungeon' | 'sunset' | 'minimalist'>('cyber_neon');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedLevelMetadata | null>(null);

  if (!isOpen || !engine) return null;

  const suggestions = [
    'Torre en espiral que asciende a las nubes con anillos turbo y gemas',
    'Pista de carrera turbo recta con saltos largos y lava en el fondo',
    'Arena circular de trampolines de alto impulso con cuatro pilares',
    'Mazmorra de parkour en zigzag con saltos de precision sobre lava',
    'Circuito flotante facil y corto para principiantes con gemas'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult(null);

    try {
      // Execute level generation
      const meta = await engine.levelGenerator.generateFromPrompt({
        prompt,
        theme,
        difficulty
      });
      setResult(meta);
      engine.game.audio.playVictory();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayNow = () => {
    onClose();
    engine.game.setMode('play');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                AI Level Generator
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">Describe tu nivel en lenguaje natural y la IA lo construirá</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Prompt de Nivel 3D</span>
            <span className="text-[10px] text-sky-400 font-sans normal-case">WebMCP Tool #20</span>
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Genera una torre en espiral con 8 plataformas que suben alto, 4 gemas, 2 anillos turbo de velocidad y lava en la base..."
            className="w-full rounded-2xl bg-slate-900/80 border border-white/10 focus:border-sky-500/50 p-3 text-xs text-slate-200 focus:outline-none transition-all resize-none font-sans"
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => setPrompt(sug)}
              className="px-2.5 py-1 rounded-xl bg-slate-900/50 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/5 hover:border-sky-500/30 text-[11px] transition-all truncate max-w-full"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Configuration Selectors */}
        <div className="grid grid-cols-2 gap-3">
          {/* Theme */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Estilo Visual</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="rounded-xl bg-slate-900/80 border border-white/10 px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="cyber_neon">Cyber Neon 🌐</option>
              <option value="dungeon">Dungeon Medieval 🏰</option>
              <option value="sunset">Retro Sunset 🌅</option>
              <option value="minimalist">Clean Studio ⚪</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Dificultad</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="rounded-xl bg-slate-900/80 border border-white/10 px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="easy">Fácil (Saltos cortos)</option>
              <option value="medium">Media (Equilibrado)</option>
              <option value="hard">Difícil (Parkour extremo)</option>
            </select>
          </div>
        </div>

        {/* Generated Result Card */}
        {result && (
          <div className="rounded-2xl bg-slate-950/70 border border-emerald-500/30 p-3.5 flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {result.title}
              </span>
              <span className="text-[10px] font-mono text-slate-400">¡Nivel Listo para Jugar!</span>
            </div>
            <p className="text-xs text-slate-300">{result.description}</p>
            <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-slate-300">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>{result.platformCount} bloques</span>
              </div>
              <div className="flex items-center gap-1 text-sky-400">
                <Diamond className="w-3 h-3" />
                <span>{result.gemsCount} gemas</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <Zap className="w-3 h-3" />
                <span>{result.jumpPadsCount} resortes</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <Flame className="w-3 h-3" />
                <span>{result.speedRingsCount} turbos</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          {!result ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-95 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Sintetizando Geometría y Físicas...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Construir Nivel con AI</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-sky-400" />
                <span>Regenerar</span>
              </button>
              <button
                onClick={handlePlayNow}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>¡Jugar Nivel Ahora!</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
