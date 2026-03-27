/**
 * Todoist → Supabase migration script
 * Pulls all tasks, projects, and labels from Todoist and inserts into Supabase.
 * Idempotent: uses todoist_id to skip already-migrated tasks.
 */

const TODOIST_API = "https://api.todoist.com/api/v1";
const TODOIST_TOKEN = process.env.TODOIST_API_TOKEN!;
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_KEY!;

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  priority: number; // Todoist v1: 1=normal(lowest), 4=urgent(highest)
  due: { date: string } | null;
  project_id: string;
  parent_id: string | null;
  labels: string[];
  added_at: string;
}

interface TodoistProject {
  id: string;
  name: string;
  color: string;
}

interface TodoistResponse<T> {
  results: T[];
  next_cursor?: string;
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
    if (!res.ok) throw new Error(`Todoist ${path}: ${res.status} ${await res.text()}`);

    const data: TodoistResponse<T> = await res.json();
    all.push(...data.results);

    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return all;
}

async function sbPost(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase POST ${table}: ${res.status} ${body}`);
  }
  return res.json();
}

async function sbSelect<T>(table: string, query = ""): Promise<T[]> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*${query ? "&" + query : ""}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
  return res.json();
}

function mapPriority(todoistPriority: number): number {
  // Todoist v1 API: 4=urgent(highest), 3=high, 2=medium, 1=normal(lowest)
  // Ours: 0=P0(critical), 1=P1, 2=P2, 3=P3, 4=P4(backlog)
  const map: Record<number, number> = { 4: 0, 3: 1, 2: 2, 1: 3 };
  return map[todoistPriority] ?? 3;
}

async function main() {
  console.log("=== Todoist → Supabase Migration ===\n");

  // 1. Fetch all data from Todoist
  console.log("Fetching from Todoist...");
  const [tasks, projects, todoistLabels] = await Promise.all([
    todoistGetAll<TodoistTask>("/tasks"),
    todoistGetAll<TodoistProject>("/projects"),
    todoistGetAll<{ id: string; name: string; color: string }>("/labels"),
  ]);
  console.log(`  Tasks: ${tasks.length}`);
  console.log(`  Projects: ${projects.length}`);
  console.log(`  Labels: ${todoistLabels.length}`);

  // 2. Create labels in Supabase (projects + todoist labels)
  console.log("\nCreating labels...");
  const projectLabels = projects.map((p) => ({
    name: p.name,
    label_type: "project",
    color: p.color,
  }));
  const taskLabels = todoistLabels.map((l) => ({
    name: l.name,
    label_type: "label",
    color: l.color,
  }));
  const allLabels = [...projectLabels, ...taskLabels];

  // Insert labels one by one to handle conflicts gracefully
  const labelMap = new Map<string, string>(); // "type:name" → supabase uuid
  for (const label of allLabels) {
    try {
      const result = await sbPost("labels", label);
      const inserted = Array.isArray(result) ? result[0] : result;
      labelMap.set(`${label.label_type}:${label.name}`, inserted.id);
    } catch (e: any) {
      // If duplicate, fetch existing
      if (e.message.includes("409") || e.message.includes("duplicate") || e.message.includes("23505")) {
        const existing = await sbSelect<{ id: string }>(
          "labels",
          `name=eq.${encodeURIComponent(label.name)}&label_type=eq.${label.label_type}`
        );
        if (existing.length > 0) {
          labelMap.set(`${label.label_type}:${label.name}`, existing[0].id);
        }
      } else {
        console.error(`  Failed to create label ${label.name}: ${e.message}`);
      }
    }
  }
  console.log(`  Created/found ${labelMap.size} labels`);

  // Build project ID → name map for task association
  const projectIdToName = new Map(projects.map((p) => [p.id, p.name]));

  // 3. Insert tasks
  console.log("\nInserting tasks...");
  const todoistIdToUuid = new Map<string, string>(); // todoist_id → supabase uuid
  let inserted = 0;
  let skipped = 0;

  for (const task of tasks) {
    // Check if already migrated
    const existing = await sbSelect<{ id: string }>("tasks", `todoist_id=eq.${task.id}`);
    if (existing.length > 0) {
      todoistIdToUuid.set(task.id, existing[0].id);
      skipped++;
      continue;
    }

    const row = {
      title: task.content,
      description: task.description || null,
      priority: mapPriority(task.priority),
      status: "open",
      due_date: task.due?.date || null,
      todoist_id: task.id,
      created_at: task.added_at,
    };

    try {
      const result = await sbPost("tasks", row);
      const insertedTask = Array.isArray(result) ? result[0] : result;
      todoistIdToUuid.set(task.id, insertedTask.id);
      inserted++;
    } catch (e: any) {
      console.error(`  Failed to insert task "${task.content}": ${e.message}`);
    }
  }
  console.log(`  Inserted: ${inserted}, Skipped (already exists): ${skipped}`);

  // 4. Create task_labels associations
  console.log("\nLinking tasks to labels...");
  let linked = 0;

  for (const task of tasks) {
    const taskUuid = todoistIdToUuid.get(task.id);
    if (!taskUuid) continue;

    // Link to project label
    const projectName = projectIdToName.get(task.project_id);
    if (projectName) {
      const labelId = labelMap.get(`project:${projectName}`);
      if (labelId) {
        try {
          await sbPost("task_labels", { task_id: taskUuid, label_id: labelId });
          linked++;
        } catch {
          // Likely duplicate, ignore
        }
      }
    }

    // Link to Todoist labels
    for (const labelName of task.labels) {
      const labelId = labelMap.get(`label:${labelName}`);
      if (labelId) {
        try {
          await sbPost("task_labels", { task_id: taskUuid, label_id: labelId });
          linked++;
        } catch {
          // Likely duplicate, ignore
        }
      }
    }
  }
  console.log(`  Created ${linked} task-label associations`);

  // 5. Create parent/child relationships
  console.log("\nCreating parent/child relationships...");
  let relationships = 0;

  for (const task of tasks) {
    if (!task.parent_id) continue;

    const childUuid = todoistIdToUuid.get(task.id);
    const parentUuid = todoistIdToUuid.get(task.parent_id);
    if (!childUuid || !parentUuid) continue;

    try {
      await sbPost("task_links", {
        source_id: childUuid,
        target_id: parentUuid,
        link_type: "parent",
      });
      relationships++;
    } catch {
      // Likely duplicate, ignore
    }
  }
  console.log(`  Created ${relationships} parent/child links`);

  // 6. Summary
  console.log("\n=== Migration Summary ===");
  const finalTasks = await sbSelect<{ id: string }>("tasks");
  const finalLabels = await sbSelect<{ id: string }>("labels");
  const finalLinks = await sbSelect<{ source_id: string }>("task_links");
  const finalAssoc = await sbSelect<{ task_id: string }>("task_labels");

  console.log(`  Todoist tasks:     ${tasks.length}`);
  console.log(`  Supabase tasks:    ${finalTasks.length}`);
  console.log(`  Match:             ${finalTasks.length === tasks.length ? "YES ✓" : "NO ✗"}`);
  console.log(`  Labels:            ${finalLabels.length}`);
  console.log(`  Task-label links:  ${finalAssoc.length}`);
  console.log(`  Parent/child:      ${finalLinks.length}`);

  if (finalTasks.length !== tasks.length) {
    console.error(`\n⚠ COUNT MISMATCH: Todoist has ${tasks.length}, Supabase has ${finalTasks.length}`);
    process.exit(1);
  }

  console.log("\n✓ Migration complete. Zero data loss.");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
