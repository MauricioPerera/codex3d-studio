import React, { useState, useEffect } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { PhotorealConditioningBundle } from '../engine/Exporter';
import { 
  X, 
  Sparkles, 
  Camera, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Sun, 
  Moon, 
  CloudRain, 
  Compass
} from 'lucide-react';

interface PhotorealModalProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PhotorealModal: React.FC<PhotorealModalProps> = ({
  engine,
  isOpen,
  onClose
}) => {
  const [activePass, setActivePass] = useState<'color' | 'depth' | 'normal'>('color');
  const [selectedStyle, setSelectedStyle] = useState<'golden_hour' | 'crisp_daylight' | 'blue_hour' | 'moody_rain'>('golden_hour');
  const [selectedCategory, setSelectedCategory] = useState<'auto' | 'product' | 'architecture' | 'scifi' | 'sculpture'>('auto');
  const [bundle, setBundle] = useState<PhotorealConditioningBundle | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');

  useEffect(() => {
    if (isOpen && engine) {
      refreshBundle(selectedStyle, selectedCategory);
    }
  }, [isOpen, selectedStyle, selectedCategory]);

  if (!isOpen || !engine) return null;

  const refreshBundle = (
    style: 'golden_hour' | 'crisp_daylight' | 'blue_hour' | 'moody_rain',
    category: 'auto' | 'product' | 'architecture' | 'scifi' | 'sculpture'
  ) => {
    const res = engine.exporter.capturePhotorealConditioning({
      style,
      category,
      width: 1024,
      height: 1024
    });
    setBundle(res);
    setEditedPrompt(res.suggestedPrompt);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(editedPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadPass = (type: 'color' | 'depth' | 'normal') => {
    if (!bundle) return;
    const url = type === 'color' ? bundle.colorPassUrl : (type === 'depth' ? bundle.depthPassUrl : bundle.normalPassUrl);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photoreal_${type}_pass_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    handleDownloadPass('color');
    setTimeout(() => handleDownloadPass('depth'), 200);
    setTimeout(() => handleDownloadPass('normal'), 400);
  };

  const styles = [
    { id: 'golden_hour' as const, label: 'Golden Hour Sunset', icon: Sun, color: 'text-amber-400' },
    { id: 'crisp_daylight' as const, label: 'Crisp Daylight', icon: Sun, color: 'text-sky-400' },
    { id: 'blue_hour' as const, label: 'Blue Hour Twilight', icon: Moon, color: 'text-indigo-400' },
    { id: 'moody_rain' as const, label: 'Moody Overcast', icon: CloudRain, color: 'text-slate-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="glass-panel w-full max-w-4xl rounded-3xl p-6 flex flex-col gap-5 border border-white/10 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              AI Photoreal Conditioning & Depth Suite
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              100% camera-locked reference frames & ControlNet passes for image diffusion
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Preview & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Multi-Pass Visual Preview */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Conditioning Passes
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setActivePass('color')}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    activePass === 'color' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Beauty Color
                </button>
                <button
                  onClick={() => setActivePass('depth')}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    activePass === 'depth' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Depth Map (ControlNet)
                </button>
                <button
                  onClick={() => setActivePass('normal')}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    activePass === 'normal' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Normal Map
                </button>
              </div>
            </div>

            {/* Frame Box */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center shadow-inner">
              {bundle ? (
                <img
                  src={
                    activePass === 'color'
                      ? bundle.colorPassUrl
                      : activePass === 'depth'
                      ? bundle.depthPassUrl
                      : bundle.normalPassUrl
                  }
                  alt="Pass Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-500">Calculating passes...</span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono">Res: {bundle?.resolution || '1024x1024'}</span>
              <button
                onClick={() => handleDownloadPass(activePass)}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium"
              >
                <Download className="w-3 h-3" />
                <span>Download {activePass.toUpperCase()} pass</span>
              </button>
            </div>
          </div>

          {/* Right: Telemetry & AI Prompt Control */}
          <div className="flex flex-col gap-4">
            {/* Camera Pose Telemetry Card */}
            {bundle && (
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Locked Camera Telemetry
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    Pitch: {bundle.camera.pitchDegrees}°
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">View Style</span>
                    <span className="text-slate-300 font-medium truncate block">{bundle.camera.viewDescription.split(' ')[0]}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Distance</span>
                    <span className="text-slate-300 font-medium">{bundle.camera.distance}m</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Lens FOV</span>
                    <span className="text-slate-300 font-medium">{bundle.camera.fov}°</span>
                  </div>
                </div>
              </div>
            )}

            {/* Subject Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Subject Context
              </label>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { id: 'auto', label: '✨ Auto Detect' },
                  { id: 'product', label: '☕ Product' },
                  { id: 'architecture', label: '🏛️ Architecture' },
                  { id: 'scifi', label: '🛸 Sci-Fi Prop' },
                  { id: 'sculpture', label: '🗿 Sculpture' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded-lg border transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-200 font-medium'
                        : 'bg-slate-900/40 hover:bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Atmosphere Style Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Atmosphere & Photoreal Lighting
              </label>
              <div className="grid grid-cols-2 gap-2">
                {styles.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStyle(s.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs transition-all ${
                        selectedStyle === s.id
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-medium shadow-md'
                          : 'bg-slate-900/40 hover:bg-white/5 border-white/5 text-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-[11px] truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Conditioning Prompt */}
            <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Exact Angle Conditioning Prompt
                </span>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full flex-1 min-h-[90px] bg-slate-950/80 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-slate-200 resize-none outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-[11px] text-slate-400 font-mono">
            Feed either Color Pass or Depth Map to Stable Diffusion / Flux ControlNet for exact camera lock.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Conditioning Bundle (3 Passes)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
