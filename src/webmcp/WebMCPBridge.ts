import { WebMCPToolDefinition, WebMCPMessage } from './types';
import { WebMCPToolExecutionEvent } from '../engine/types';

export class WebMCPBridge {
  private static instance: WebMCPBridge;
  private tools: Map<string, WebMCPToolDefinition> = new Map();
  private executionHistory: WebMCPToolExecutionEvent[] = [];
  private listeners: Array<(event: WebMCPToolExecutionEvent) => void> = [];
  private activeExecution: WebMCPToolExecutionEvent | null = null;

  private constructor() {
    this.setupNavigatorModelContext();
    this.setupWindowBridge();
    this.setupPostMessageBridge();
  }

  public static getInstance(): WebMCPBridge {
    if (!WebMCPBridge.instance) {
      WebMCPBridge.instance = new WebMCPBridge();
    }
    return WebMCPBridge.instance;
  }

  private setupNavigatorModelContext() {
    const self = this;
    const modelContext = {
      registerTool(toolOrSchema: any, handler?: (args: any) => Promise<any> | any) {
        if (typeof handler === 'function') {
          self.registerTool({
            name: toolOrSchema.name,
            description: toolOrSchema.description || '',
            parameters: toolOrSchema.inputSchema || toolOrSchema.parameters || { type: 'object', properties: {} },
            execute: handler
          });
        } else if (toolOrSchema && typeof toolOrSchema.execute === 'function') {
          self.registerTool(toolOrSchema);
        } else {
          throw new Error('[WebMCP] Invalid tool registration: missing name and execute function');
        }
      },
      listTools() {
        return self.listTools();
      },
      executeTool(name: string, args: any = {}) {
        return self.executeTool(name, args);
      }
    };

    try {
      if (!('modelContext' in navigator)) {
        Object.defineProperty(navigator, 'modelContext', {
          value: modelContext,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } else {
        // Wrap existing
        const existing = (navigator as any).modelContext;
        if (existing && typeof existing.registerTool === 'function') {
          const originalReg = existing.registerTool.bind(existing);
          existing.registerTool = (tool: any, handler?: any) => {
            try { originalReg(tool, handler); } catch {}
            modelContext.registerTool(tool, handler);
          };
        }
      }
    } catch (e) {
      console.warn('[WebMCP] Could not attach to navigator.modelContext:', e);
      (navigator as any).modelContext = modelContext;
    }
  }

  private setupWindowBridge() {
    const bridgeApi = {
      listTools: () => this.listTools(),
      executeTool: (name: string, args: any) => this.executeTool(name, args),
      call: (name: string, args: any) => this.executeTool(name, args),
      getHistory: () => this.getHistory(),
      getActiveExecution: () => this.activeExecution
    };

    (window as any).webmcp = bridgeApi;
    (window as any).__WEBMCP__ = bridgeApi;
    (window as any).codex3d = bridgeApi;
  }

  private setupPostMessageBridge() {
    const MESSAGE_SOURCE = 'WEBMCP_MAIN_WORLD';
    const BRIDGE_SOURCE = 'WEBMCP_ISOLATED_WORLD';

    window.addEventListener('message', async (event: MessageEvent<WebMCPMessage>) => {
      if (!event.data) return;

      // Handle isolated world / extension agent request
      if (event.data.source === BRIDGE_SOURCE && event.data.type === 'WEBMCP_CALL_TOOL') {
        const { requestId, toolName, args } = event.data;
        if (!toolName) return;

        try {
          const result = await this.executeTool(toolName, args || {});
          window.postMessage({
            source: MESSAGE_SOURCE,
            type: 'WEBMCP_TOOL_RESULT',
            requestId,
            toolName,
            result
          }, '*');
        } catch (error: any) {
          window.postMessage({
            source: MESSAGE_SOURCE,
            type: 'WEBMCP_TOOL_RESULT',
            requestId,
            toolName,
            error: error?.message || String(error)
          }, '*');
        }
      }

      // Allow generic window-to-window RPC
      if (event.data.type === 'WEBMCP_CALL') {
        const { requestId, tool, args } = event.data as any;
        try {
          const result = await this.executeTool(tool, args || {});
          window.postMessage({
            type: 'WEBMCP_RESPONSE',
            requestId,
            result,
            success: true
          }, '*');
        } catch (error: any) {
          window.postMessage({
            type: 'WEBMCP_RESPONSE',
            requestId,
            error: error?.message || String(error),
            success: false
          }, '*');
        }
      }
    });
  }

  public registerTool(tool: WebMCPToolDefinition) {
    this.tools.set(tool.name, tool);
    this.notifyToolsUpdated();
  }

  public listTools() {
    return Array.from(this.tools.values()).map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
      inputSchema: parameters
    }));
  }

  public async executeTool(name: string, args: any = {}): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`[WebMCP] Unknown tool: '${name}'. Available: ${Array.from(this.tools.keys()).join(', ')}`);
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = performance.now();

    const eventRecord: WebMCPToolExecutionEvent = {
      id: eventId,
      timestamp: Date.now(),
      tool: name,
      args,
      status: 'running'
    };

    this.activeExecution = eventRecord;
    this.executionHistory.unshift(eventRecord);
    this.notifyListeners(eventRecord);

    try {
      const result = await tool.execute(args);
      const durationMs = Math.round(performance.now() - startTime);

      eventRecord.status = 'success';
      eventRecord.durationMs = durationMs;
      eventRecord.result = result;
      this.activeExecution = null;
      this.notifyListeners({ ...eventRecord });

      return result;
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const errMsg = error?.message || String(error);

      eventRecord.status = 'error';
      eventRecord.durationMs = durationMs;
      eventRecord.error = errMsg;
      this.activeExecution = null;
      this.notifyListeners({ ...eventRecord });

      throw error;
    }
  }

  private notifyToolsUpdated() {
    window.postMessage({
      source: 'WEBMCP_MAIN_WORLD',
      type: 'WEBMCP_TOOLS_UPDATED',
      payload: {
        tools: this.listTools(),
        title: document.title,
        url: window.location.href
      }
    }, '*');
  }

  public subscribe(listener: (event: WebMCPToolExecutionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: WebMCPToolExecutionEvent) {
    this.listeners.forEach(l => l(event));
  }

  public getHistory(): WebMCPToolExecutionEvent[] {
    return [...this.executionHistory];
  }

  public getActiveTool(): WebMCPToolExecutionEvent | null {
    return this.activeExecution;
  }
}
