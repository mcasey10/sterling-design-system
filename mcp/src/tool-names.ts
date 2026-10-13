// The names of the server's tools, in the order they are registered. Plain data with no imports: the export
// script (ui/scripts/lib/ai-export.ts) lists them in llms.txt, and a test fails if the server registers
// anything else.

export const TOOL_NAMES = [
  "list_components",
  "get_component",
  "get_tokens",
  "get_token",
  "list_guidelines",
  "get_guideline",
  "get_pattern",
  "search",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
