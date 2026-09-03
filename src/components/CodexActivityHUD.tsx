import React, { useEffect, useState } from 'react';
import { WebMCPBridge } from '../webmcp/WebMCPBridge';
import { WebMCPToolExecutionEvent } from '../engine/types';
import { Cpu, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const CodexActivityHUD: React.FC = () => {
  const [activeEvent, setActiveEvent] = useState<WebMCPToolExecutionEvent | null>(null);
  const [lastFinished, setLastFinished] = useState<WebMCPToolExecutionEvent | null>(null);

  useEffect(() => {
    const bridge = WebMCPBridge.getInstance();
    const unsubscribe = bridge.subscribe((evt) => {
      if (evt.status === 'running') {
        setActiveEvent(evt);
      } else {
        setActiveEvent(null);
        setLastFinished(evt);
        const timer = setTimeout(() => {
          setLastFinished(prev => (prev?.id === evt.id ? null : prev));
        }, 4000);
        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
      {/* Brand & Connection Badge */}
      <div className="glass-pill px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-lg border border-white/10">
        <div className="relative flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
          <div className="w-2 h-2 rounded-full bg-emerald-400 relative z-10" />
        </div>
        <span className="font-semibold text-xs tracking-wider uppercase text-slate-300">
          Codex<span className="text-sky-400">3D</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
          WebMCP v1
        </span>
      </div>

      {/* Dynamic Agent Activity Pill */}
      {activeEvent ? (
        <div className="glass-pill px-3.5 py-2 rounded-xl flex items-center gap-2.5 border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs font-mono shadow-lg animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>
            <strong className="text-white">[Codex]</strong> {activeEvent.tool}
          </span>
          <span className="text-emerald-400/70 text-[11px] truncate max-w-[180px]">
            {JSON.stringify(activeEvent.args).slice(0, 32)}...
          </span>
        </div>
      ) : lastFinished ? (
        <div className="glass-pill px-3.5 py-2 rounded-xl flex items-center gap-2 border border-slate-700/60 text-xs font-mono text-slate-300 shadow-lg transition-all">
          {lastFinished.status === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>
            {lastFinished.tool} ({lastFinished.durationMs}ms)
          </span>
        </div>
      ) : (
        <div className="glass-pill px-3 py-1.5 rounded-xl hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span>Listening on <code className="text-sky-400">navigator.modelContext</code></span>
        </div>
      )}
    </div>
  );
};
