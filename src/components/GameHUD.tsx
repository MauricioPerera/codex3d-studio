import React from 'react';
import { GameState } from '../game/GameManager';
import { Heart, Trophy, Clock, Play, RotateCcw, X, Sparkles, Diamond } from 'lucide-react';

interface GameHUDProps {
  gameState: GameState;
  onToggleMode: () => void;
  onRestart: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  onToggleMode,
  onRestart
}) => {
  if (gameState.mode !== 'play') return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-6 select-none font-sans">
      {/* Top Header Stats */}
      <div className="flex items-center justify-between pointer-events-auto">
        {/* Lives & Gems */}
        <div className="flex items-center gap-3">
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
            <span className="font-mono text-sm font-bold text-sky-200">
              {gameState.gemsCollected} / {gameState.totalGems}
            </span>
          </div>

          {/* Score */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">Score</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {gameState.score}
            </span>
          </div>
        </div>

        {/* Center: Timer */}
        <div className="glass-panel px-4 py-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-sm font-bold text-amber-200">
            {formatTime(gameState.elapsedTime)}
          </span>
        </div>

        {/* Right: Exit to Edit Button */}
        <button
          onClick={onToggleMode}
          className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/10 hover:border-white/30 text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 group"
        >
          <span className="text-xs font-semibold">Exit to Editor</span>
          <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
        </button>
      </div>

      {/* Bottom Hint Pill */}
      <div className="flex justify-center mb-2">
        <div className="glass-panel px-5 py-2 rounded-2xl flex items-center gap-4 text-xs font-mono text-slate-300 border border-white/10 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1">
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">W</span>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">A</span>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">S</span>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">D</span>
            <span className="text-slate-400 ml-1">Move</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="flex items-center gap-1">
            <span className="bg-white/10 px-2 py-0.5 rounded text-white font-bold">SPACE</span>
            <span className="text-slate-400 ml-1">Jump</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="flex items-center gap-1">
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">SHIFT</span>
            <span className="text-slate-400 ml-1">Sprint</span>
          </div>
        </div>
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
