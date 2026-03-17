/**
 * Bright Line Studio OS – tool registry
 *
 * Simple in-memory registry of tools that agents can call. No execution here;
 * just name and description for discovery. Extend later with handlers.
 */

export interface ToolDef {
  id: string;
  name: string;
  description: string;
}

const registry = new Map<string, ToolDef>();

export function registerTool(def: ToolDef): void {
  registry.set(def.id, def);
}

export function getTool(id: string): ToolDef | undefined {
  return registry.get(id);
}

export function listTools(): ToolDef[] {
  return Array.from(registry.values());
}

// Phase 2: register placeholder tools
registerTool({ id: "analyze_inquiry", name: "Analyze inquiry", description: "Analyze a lead or inquiry and suggest next steps." });
registerTool({ id: "generate_caption", name: "Generate caption", description: "Generate a marketing caption for a project." });
