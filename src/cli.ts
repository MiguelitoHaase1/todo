#!/usr/bin/env tsx
/**
 * td — headless brain task CLI
 *
 * Commands:
 *   td add "title" [-p priority] [--due date]
 *   td list [--today] [--json]
 *   td done <id>
 *   td show <id>
 */

import { parseArgs } from "node:util";
import { cmdAdd } from "./commands/add.ts";
import { cmdList } from "./commands/list.ts";
import { cmdDone } from "./commands/done.ts";
import { cmdShow } from "./commands/show.ts";
import { cmdTriage } from "./commands/triage.ts";

const USAGE = `td — headless brain task CLI

Commands:
  td add "title" [-p 0-4] [--due YYYY-MM-DD]   Create a task
  td list [--today] [--status open|done|all]     List tasks
  td done <id>                                   Mark task complete
  td show <id>                                   Show task details
  td triage                                      Surface tasks to triage
  td triage exec "drop 1, defer 2"               Execute a triage reply

Flags:
  --json    Machine-readable JSON output
  --help    Show this help message
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "add":
      await cmdAdd(rest);
      break;
    case "list":
    case "ls":
      await cmdList(rest);
      break;
    case "done":
      await cmdDone(rest);
      break;
    case "show":
      await cmdShow(rest);
      break;
    case "triage":
      await cmdTriage(rest);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
