import React, { useState, useEffect } from 'react';
import { StudioEngine } from '../engine/StudioEngine';
import { X, Download, Image, Check, FileCode, Gamepad2 } from 'lucide-react';

interface RenderExportModalProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RenderExportModal: React.FC<RenderExportModalProps> = ({
  engine,
  isOpen,
  onClose
}) => {
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isTransparent, setIsTransparent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && engine) {
      generateSnapshot();
    }
  }, [isOpen, isTransparent]);

  if (!isOpen || !engine) return null;

  const generateSnapshot = () => {
    const url = engine.exporter.renderSnapshot({
      width: 1400,
      height: 1400,
      transparent: isTransparent
    });
    setSnapshotUrl(url);
  };

  const handleDownloadSnapshot = () => {
    if (!snapshotUrl) return;
    const a = document.createElement('a');
    a.href = snapshotUrl;
    a.download = `render_${isTransparent ? 'alpha_' : ''}${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportGLB = async () => {
    setIsExporting(true);
    try {
      const fileName = `studio_model_${Date.now()}.glb`;
      const { blob } = await engine.exporter.exportGLB(undefined, fileName);
      engine.exporter.downloadFile(blob, fileName);
      setExportedFormat('glb');
      setTimeout(() => setExportedFormat(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportOBJ = () => {
    setIsExporting(true);
    try {
      const fileName = `studio_model_${Date.now()}.obj`;
      const { text } = engine.exporter.exportOBJ(undefined);
      engine.exporter.downloadFile(text, fileName);
      setExportedFormat('obj');
      setTimeout(() => setExportedFormat(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStandaloneHTML = async () => {
    setIsExporting(true);
    try {
      const fileName = `playable_game_${Date.now()}.html`;
      const { html } = await engine.exporter.exportStandaloneGameHTML('Codex3D Web Game');
      engine.exporter.downloadFile(html, fileName);
      setExportedFormat('html');
      setTimeout(() => setExportedFormat(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 flex flex-col gap-4 border border-white/10 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Image className="w-5 h-5 text-sky-400" />
              Render & Export Asset Suite
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Studio snapshots, standard 3D meshes, and standalone playable games
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Frame */}
        <div className="relative aspect-square max-h-72 w-full rounded-2xl overflow-hidden border border-white/10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950 flex items-center justify-center">
          {snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt="Asset Render Preview"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-slate-500">Rendering frame...</span>
          )}
        </div>

        {/* Options & Export Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Transparency toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={(e) => setIsTransparent(e.target.checked)}
              className="rounded bg-slate-800 border-white/20 text-sky-500 focus:ring-sky-400 focus:ring-offset-0"
            />
            <span>Transparent Background (PNG Alpha)</span>
          </label>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadSnapshot}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium transition-colors border border-white/5"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handleExportGLB}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-md active:scale-95"
            >
              {exportedFormat === 'glb' ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>Export GLB</span>
            </button>

            <button
              onClick={handleExportOBJ}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium transition-colors border border-white/5"
            >
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Export OBJ</span>
            </button>

            {/* Standalone HTML Game Export */}
            <button
              onClick={handleExportStandaloneHTML}
              disabled={isExporting}
              title="Exports self-contained offline playable HTML game"
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 border border-emerald-400/30"
            >
              <Gamepad2 className="w-4 h-4 text-emerald-200" />
              <span>{exportedFormat === 'html' ? 'Downloaded Game!' : 'Export Game (.html)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
