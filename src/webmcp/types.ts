export interface WebMCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any> | any;
}

export interface WebMCPMessage {
  source: string;
  type: string;
  requestId?: string;
  toolName?: string;
  args?: any;
  payload?: any;
  result?: any;
  error?: string;
}
