/**
 * Standard tool response envelope.
 *
 * The MCP SDK requires `structuredContent` to satisfy `Record<string, unknown>`,
 * which most of our typed return values (Task, TaskLink, etc.) don't structurally
 * match because they lack an index signature. The cast lives here once instead of
 * being repeated at every tool's return site.
 */

export function toolResult<T extends object>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as unknown as Record<string, unknown>,
  };
}
