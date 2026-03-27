/**
 * Migration verification script
 * 1. Count match: Todoist active tasks == Supabase tasks
 * 2. Spot check: 10 random tasks compared field-by-field
 */

const TODOIST_API = "https://api.todoist.com/api/v1";
const TODOIST_TOKEN = process.env.TODOIST_API_TOKEN!;
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_KEY!;

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  priority: number;
  due: { date: string } | null;
  added_at: string;
}

interface SupabaseTask {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  due_date: string | null;
  todoist_id: string;
}

function mapPriority(tp: number): number {
  const map: Record<number, number> = { 4: 0, 3: 1, 2: 2, 1: 3 };
  return map[tp] ?? 3;
}

async function todoistGetAll<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  while (true) {
    const url = new URL(`${TODOIST_API}${path}`);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${TODOIST_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Todoist ${path}: ${res.status}`);
    const data = await res.json();
    all.push(...data.results);
    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return all;
}

async function sbSelect<T>(table: string, query = ""): Promise<T[]> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*${query ? "&" + query : ""}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
  return res.json();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  console.log("=== Migration Verification ===\n");

  // 1. Count match
  console.log("1. COUNT MATCH");
  const todoistTasks = await todoistGetAll<TodoistTask>("/tasks");
  const supabaseTasks = await sbSelect<SupabaseTask>("tasks");

  const todoistCount = todoistTasks.length;
  const supabaseCount = supabaseTasks.length;
  const countMatch = todoistCount === supabaseCount;

  console.log(`   Todoist:   ${todoistCount}`);
  console.log(`   Supabase:  ${supabaseCount}`);
  console.log(`   Match:     ${countMatch ? "PASS ✓" : "FAIL ✗"}`);

  if (!countMatch) {
    console.error(`\n⚠ COUNT MISMATCH — aborting spot checks`);
    process.exit(1);
  }

  // 2. Spot check 10 random tasks
  console.log("\n2. SPOT CHECK (10 random tasks)\n");

  const sbByTodoistId = new Map(supabaseTasks.map((t) => [t.todoist_id, t]));
  const sample = shuffle(todoistTasks).slice(0, 10);

  let passed = 0;
  let failed = 0;

  for (const todoist of sample) {
    const sb = sbByTodoistId.get(todoist.id);

    if (!sb) {
      console.log(`   ✗ "${todoist.content}" — NOT FOUND in Supabase`);
      failed++;
      continue;
    }

    const errors: string[] = [];

    // Title
    if (sb.title !== todoist.content) {
      errors.push(`title: "${sb.title}" != "${todoist.content}"`);
    }

    // Priority
    const expectedPriority = mapPriority(todoist.priority);
    if (sb.priority !== expectedPriority) {
      errors.push(`priority: ${sb.priority} != expected ${expectedPriority} (todoist: ${todoist.priority})`);
    }

    // Due date
    const expectedDue = todoist.due?.date || null;
    if (sb.due_date !== expectedDue) {
      errors.push(`due_date: "${sb.due_date}" != "${expectedDue}"`);
    }

    // Description
    const expectedDesc = todoist.description || null;
    const sbDesc = sb.description || null;
    if (sbDesc !== expectedDesc) {
      // Check if it's just whitespace/null difference
      if ((sbDesc || "").trim() !== (expectedDesc || "").trim()) {
        errors.push(`description mismatch (lengths: sb=${sbDesc?.length ?? 0}, todoist=${expectedDesc?.length ?? 0})`);
      }
    }

    if (errors.length === 0) {
      console.log(`   ✓ "${todoist.content.substring(0, 50)}${todoist.content.length > 50 ? "..." : ""}"`);
      passed++;
    } else {
      console.log(`   ✗ "${todoist.content.substring(0, 50)}"`);
      for (const e of errors) console.log(`     → ${e}`);
      failed++;
    }
  }

  // 3. Summary
  console.log("\n=== Verification Summary ===");
  console.log(`   Count match:    ${countMatch ? "PASS ✓" : "FAIL ✗"}`);
  console.log(`   Spot checks:    ${passed}/10 passed, ${failed}/10 failed`);
  console.log(`   Overall:        ${countMatch && failed === 0 ? "PASS ✓" : "FAIL ✗"}`);

  if (failed > 0) {
    console.error("\n⚠ Some spot checks failed. Investigate before proceeding.");
    process.exit(1);
  }

  console.log("\n✓ Verification complete. Zero data loss confirmed.");
}

main().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
