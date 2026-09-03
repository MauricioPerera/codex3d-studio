import React, { useState } from 'react';
import { GameState } from '../game/GameManager';
import { StudioEngine } from '../engine/StudioEngine';
import { 
  Heart, 
  Trophy, 
  Clock, 
  RotateCcw, 
  X, 
  Sparkles, 
  Diamond, 
  User, 
  Circle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface GameHUDProps {
  gameState: GameState;
  onToggleMode: () => void;
  onRestart: () => void;
  engine: StudioEngine | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  onToggleMode,
  onRestart,
  engine
}) => {
  const [avatar, setAvatar] = useState<'voxel_runner' | 'marble_ball'>('voxel_runner');

  if (gameState.mode !== 'play') return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleAvatar = () => {
    if (!engine) return;
    const next = avatar === 'voxel_runner' ? 'marble_ball' : 'voxel_runner';
    setAvatar(next);
    engine.game.controller.setAvatar(next);
  };

  // Virtual Touch Handlers
  const handleTouchDir = (f: number, r: number) => {
    if (!engine) return;
    engine.game.controller.touchMove.forward = f;
    engine.game.controller.touchMove.right = r;
  };

  const handleTouchJump = () => {
    if (!engine) return;
    engine.game.controller.jump();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 md:p-6 select-none font-sans">
      {/* Top Header Stats */}
      <div className="flex items-center justify-between pointer-events-auto">
        {/* Lives & Gems */}
        <div className="flex items-center gap-2.5">
          {/* Lives Counter */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/10 shadow-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-all ${
                  i < gameState.lives
                    ? 'text-rose-500 fill-rose-500 filter drop-shadow(0 0 4px rgba(244,63,94,0.6))'
                    : 'text-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Gems Counter */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg">
            <Diamond className="w-4 h-4 text-sky-400 fill-sky-400/30" />
            <span className="font-mono text-xs md:text-sm font-bold text-sky-200">
              {gameState.gemsCollected} / {gameState.totalGems}
            </span>
          </div>

          {/* Score */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg hidden sm:flex">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Score</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {gameState.score}
            </span>
          </div>
        </div>

        {/* Center: Timer & Avatar Switcher */}
        <div className="flex items-center gap-2">
          <div className="glass-panel px-4 py-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs md:text-sm font-bold text-amber-200">
              {formatTime(gameState.elapsedTime)}
            </span>
          </div>

          {/* Avatar Switcher */}
          <button
            onClick={handleToggleAvatar}
            title="Switch Player Avatar"
            className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/10 hover:border-white/30 text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 text-xs font-mono"
          >
            {avatar === 'voxel_runner' ? (
              <>
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">Voxel</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
                <span className="hidden md:inline">Marble</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Exit to Edit Button */}
        <button
          onClick={onToggleMode}
          className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2 border border-white/10 hover:border-white/30 text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 group"
        >
          <span className="text-xs font-semibold hidden sm:inline">Exit to Editor</span>
          <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
        </button>
      </div>

      {/* On-Screen Mobile Virtual Controls (D-Pad Left, Jump Button Right) */}
      <div className="flex items-end justify-between pointer-events-auto pb-2">
        {/* Virtual D-Pad */}
        <div className="grid grid-cols-3 gap-1 w-32 h-32 p-1.5 rounded-2xl glass-panel border border-white/10 shadow-2xl opacity-75 hover:opacity-100 transition-opacity">
          <div />
          <button
            onPointerDown={() => handleTouchDir(1, 0)}
            onPointerUp={() => handleTouchDir(0, 0)}
            className="flex items-center justify-center rounded-xl bg-white/10 active:bg-sky-500/40 text-white"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            onPointerDown={() => handleTouchDir(0, -1)}
            onPointerUp={() => handleTouchDir(0, 0)}
            className="flex items-center justify-center rounded-xl bg-white/10 active:bg-sky-500/40 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center text-[9px] font-mono text-slate-500">
            D-PAD
          </div>
          <button
            onPointerDown={() => handleTouchDir(0, 1)}
            onPointerUp={() => handleTouchDir(0, 0)}
            className="flex items-center justify-center rounded-xl bg-white/10 active:bg-sky-500/40 text-white"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div />
          <button
            onPointerDown={() => handleTouchDir(-1, 0)}
            onPointerUp={() => handleTouchDir(0, 0)}
            className="flex items-center justify-center rounded-xl bg-white/10 active:bg-sky-500/40 text-white"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <div />
        </div>

        {/* Center Keyboard Hint */}
        <div className="hidden md:flex justify-center mb-2">
          <div className="glass-panel px-4 py-1.5 rounded-2xl flex items-center gap-3 text-xs font-mono text-slate-300 border border-white/10 shadow-xl">
            <span>WASD Move</span>
            <span className="text-white/20">•</span>
            <span>SPACE Jump</span>
            <span className="text-white/20">•</span>
            <span>SHIFT Sprint</span>
            <span className="text-white/20">•</span>
            <span>Drag Mouse to Rotate</span>
          </div>
        </div>

        {/* Virtual Jump Button */}
        <button
          onPointerDown={handleTouchJump}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 active:scale-90 text-white font-bold text-sm shadow-2xl flex flex-col items-center justify-center border-2 border-white/30 opacity-85 hover:opacity-100 transition-all"
        >
          <ArrowUp className="w-6 h-6 stroke-[3]" />
          <span className="text-[10px] tracking-wider uppercase font-mono">JUMP</span>
        </button>
      </div>

      {/* Victory Modal */}
      {gameState.status === 'won' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 flex flex-col items-center gap-5 border border-amber-500/40 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                Level Complete!
                <Sparkles className="w-5 h-5 text-amber-400" />
              </h2>
              <p className="text-sm text-slate-400">
                You conquered the obstacle course and reached the goal portal!
              </p>
            </div>

            {/* Stats Card */}
            <div className="w-full grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-white/5 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Final Score</span>
                <span className="text-base font-bold text-emerald-400">{gameState.score}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Time</span>
                <span className="text-base font-bold text-amber-300">{formatTime(gameState.elapsedTime)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Gems</span>
                <span className="text-base font-bold text-sky-400">{gameState.gemsCollected}/{gameState.totalGems}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={onRestart}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
              <button
                onClick={onToggleMode}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Edit Scene</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.status === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 flex flex-col items-center gap-5 border border-rose-500/40 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-lg">
              <Heart className="w-8 h-8 text-rose-500" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">
                Game Over
              </h2>
              <p className="text-sm text-slate-400">
                You ran out of lives! Beware of the lava zones and falling off the course.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={onRestart}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={onToggleMode}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Edit Scene</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
