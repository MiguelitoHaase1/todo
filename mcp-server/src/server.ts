/**
 * Module-level McpServer instance with all tools registered.
 *
 * Constructed once per cold start. Tool registration is idempotent and runs
 * inline at module load — no async setup, no I/O. Read-only tools are
 * registered before mutations so they appear first in tools/list responses.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListTool } from "./tools/list.js";
import { registerAddTool } from "./tools/add.js";
import { registerDoneTool } from "./tools/done.js";
import { registerDropTool } from "./tools/drop.js";
import { registerEditTool } from "./tools/edit.js";
import { registerShowTool } from "./tools/show.js";
import { registerLinkTool } from "./tools/link.js";
import { registerUnlinkTool } from "./tools/unlink.js";
import { registerTriageListTool } from "./tools/triage-list.js";
import { registerTriageExecuteTool } from "./tools/triage-execute.js";
import { registerMorningContextTool } from "./tools/morning-context.js";
import { registerPlanTomorrowContextTool } from "./tools/plan-tomorrow-context.js";

export const server = new McpServer({
  name: "todolist-mcp-server",
  version: "0.1.0",
});

// Read-only tools
registerListTool(server);
registerShowTool(server);
registerTriageListTool(server);
registerMorningContextTool(server);
registerPlanTomorrowContextTool(server);

// Mutations
registerAddTool(server);
registerDoneTool(server);
registerDropTool(server);
registerEditTool(server);
registerLinkTool(server);
registerUnlinkTool(server);
registerTriageExecuteTool(server);
