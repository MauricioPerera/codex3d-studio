import React, { useState, useEffect } from 'react';
import { WebMCPBridge } from '../webmcp/WebMCPBridge';
import { WebMCPToolExecutionEvent } from '../engine/types';
import { 
  Terminal, 
  Wrench, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  AlertCircle, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface WebMCPConsoleDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const WebMCPConsoleDrawer: React.FC<WebMCPConsoleDrawerProps> = ({
  isOpen,
  onToggle
}) => {
  const bridge = WebMCPBridge.getInstance();
  const [activeTab, setActiveTab] = useState<'logs' | 'tools' | 'runner' | 'templates'>('logs');
  const [history, setHistory] = useState<WebMCPToolExecutionEvent[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('create_primitive');
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify({ type: 'torus_knot', materialPreset: 'cyber_neon' }, null, 2)
  );
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    setHistory(bridge.getHistory());
    const unsub = bridge.subscribe(() => {
      setHistory(bridge.getHistory());
    });
    return unsub;
  }, []);

  const tools = bridge.listTools();

  const handleSelectTool = (toolName: string) => {
    setSelectedTool(toolName);
    const tool = tools.find(t => t.name === toolName);
    if (tool && tool.parameters?.properties) {
      // create sensible default payload from properties
      const defaultArgs: Record<string, any> = {};
      Object.entries(tool.parameters.properties).forEach(([key, val]: [string, any]) => {
        if (val.enum) defaultArgs[key] = val.enum[0];
        else if (val.type === 'string') defaultArgs[key] = 'Studio Item';
        else if (val.type === 'number') defaultArgs[key] = 1.0;
        else if (val.type === 'boolean') defaultArgs[key] = true;
        else if (val.type === 'array') defaultArgs[key] = [0, 1, 0];
      });
      setTestPayload(JSON.stringify(defaultArgs, null, 2));
    }
  };

  const handleRunTest = async () => {
    setIsExecuting(true);
    setTestOutput(null);
    try {
      const parsedArgs = JSON.parse(testPayload);
      const res = await bridge.executeTool(selectedTool, parsedArgs);
      setTestOutput(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setTestOutput(`Error: ${err?.message || String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLoadTemplate = async (template: string) => {
    await bridge.executeTool('load_sample_template', { template });
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
      isOpen ? 'h-64' : 'h-10'
    } glass-panel border-t border-white/10 flex flex-col shadow-2xl backdrop-blur-xl`}>
      {/* Top Header Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>WebMCP Agent Console</span>
          </div>

          <div className="flex items-center gap-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setActiveTab('logs'); if (!isOpen) onToggle(); }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeTab === 'logs' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Activity Feed ({history.length})
            </button>
            <button
              onClick={() => { setActiveTab('tools'); if (!isOpen) onToggle(); }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeTab === 'tools' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tools ({tools.length})
            </button>
            <button
              onClick={() => { setActiveTab('runner'); if (!isOpen) onToggle(); }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeTab === 'runner' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive Tester
            </button>
            <button
              onClick={() => { setActiveTab('templates'); if (!isOpen) onToggle(); }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeTab === 'templates' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Showcase Templates
            </button>
          </div>
        </div>

        <button className="text-slate-400 hover:text-white">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Drawer Body */}
      {isOpen && (
        <div className="flex-1 overflow-hidden p-3 text-xs">
          {/* TAB 1: Activity Feed */}
          {activeTab === 'logs' && (
            <div className="h-full overflow-y-auto space-y-1.5 font-mono text-[11px] pr-2">
              {history.length === 0 ? (
                <div className="text-slate-500 py-6 text-center italic">
                  No WebMCP commands executed yet. Codex or external agents calling tools will log here in real-time.
                </div>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-900/60 border border-white/5 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.status === 'running' ? (
                          <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
                        ) : item.status === 'success' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                        )}
                        <span className="font-semibold text-sky-400">{item.tool}</span>
                        {item.durationMs !== undefined && (
                          <span className="text-slate-500 text-[10px]">{item.durationMs}ms</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[10px] truncate">
                        Args: {JSON.stringify(item.args)}
                      </div>
                      {item.result && (
                        <div className="text-emerald-400/90 text-[10px] truncate">
                          Result: {JSON.stringify(item.result)}
                        </div>
                      )}
                      {item.error && (
                        <div className="text-rose-400 text-[10px]">
                          Error: {item.error}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Registered Tools */}
          {activeTab === 'tools' && (
            <div className="h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pr-2">
              {tools.map(tool => (
                <div
                  key={tool.name}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-emerald-400">{tool.name}</span>
                    <button
                      onClick={() => { handleSelectTool(tool.name); setActiveTab('runner'); }}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Test &rarr;
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Interactive Tester */}
          {activeTab === 'runner' && (
            <div className="h-full flex gap-3">
              <div className="w-1/3 flex flex-col gap-2">
                <label className="text-[10px] uppercase font-mono text-slate-400">Select Tool</label>
                <select
                  value={selectedTool}
                  onChange={(e) => handleSelectTool(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-slate-200 outline-none"
                >
                  {tools.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleRunTest}
                  disabled={isExecuting}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-3 rounded-lg font-medium transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Executing...' : 'Invoke via WebMCP'}</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] uppercase font-mono text-slate-400">JSON Arguments</label>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg p-2 font-mono text-[11px] text-slate-200 resize-none outline-none focus:border-sky-500/50"
                />
              </div>

              {testOutput && (
                <div className="w-1/3 flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400">Execution Output</label>
                  <pre className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg p-2 font-mono text-[10px] text-emerald-400 overflow-y-auto whitespace-pre-wrap">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Showcase Templates */}
          {activeTab === 'templates' && (
            <div className="h-full flex items-center justify-center gap-4">
              <button
                onClick={() => handleLoadTemplate('coffee_studio')}
                className="flex-1 max-w-xs p-4 rounded-xl glass-panel hover:border-amber-400/40 transition-all text-left group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                  Coffee Studio
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Warm editorial lighting, curved plinth, parametric ceramic mug.
                </div>
              </button>

              <button
                onClick={() => handleLoadTemplate('cyber_showcase')}
                className="flex-1 max-w-xs p-4 rounded-xl glass-panel hover:border-cyan-400/40 transition-all text-left group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                  Cyber Showcase
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Neon sunset lighting, obsidian carbon crate, floating quantum core.
                </div>
              </button>

              <button
                onClick={() => handleLoadTemplate('sculpture_pedestal')}
                className="flex-1 max-w-xs p-4 rounded-xl glass-panel hover:border-sky-400/40 transition-all text-left group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                  Sculpture Plinth
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Studio high-key lighting, stepped architectural pedestal, twisted gold monolith.
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
