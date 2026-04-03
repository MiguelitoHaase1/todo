# Task Capture Guardrails

## One message = one task (default)

Every inbound message produces **exactly one task** unless the user gives an
explicit multi-task signal. When in doubt, capture one task with the full
message as the title. Never split conversational phrasing into ghost tasks.

### Explicit multi-task signals (allow splitting)

| Pattern | Example | Tasks created |
|---------|---------|---------------|
| `add N tasks:` | "add two tasks: buy milk, call dentist" | N |
| `add [number] tasks:` | "add 3 tasks: a, b, c" | 3 |
| `add tasks:` | "add tasks: X, Y" | comma count |
| `N things:` | "three things: write email, update doc, send report" | 3 |
| Numbered list | "1. Buy milk\n2. Call dentist" | list length |

### NOT multi-task signals (always one task)

- "do X before starting at Y" → 1 task
- "buy milk and eggs" → 1 task  
- "finish the report and send it" → 1 task
- "remind me to X" → 1 task
- Any message without an explicit prefix above → 1 task

## Implementation

The detection logic lives in `src/capture-guardrail.ts` as `detectTaskCount(message)`.

```typescript
import { detectTaskCount } from "./capture-guardrail.ts";

const count = detectTaskCount(userMessage);
if (count === 1) {
  // Capture full message as a single task title
} else {
  // Split on commas or newlines and create N tasks
}
```

## Why

False splits are direct trust hits. Every ghost task created from over-parsing
one message creates cleanup work and erodes confidence in capture. The explicit
signal requirement ensures we only split when the user clearly intends it.
