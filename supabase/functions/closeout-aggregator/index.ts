// Afternoon closeout: today's finished tasks and still-open tasks, written to
// public.daily_closeouts for Lovable OS. Called by pg_cron on weekdays (see
// migration 20261010230000_daily_closeouts.sql).
//
// Calls are not collected. Wingman's data lives in its own Lovable Cloud
// project, reachable only through its MCP with Michael's OAuth session, so
// there is no server-side route to read it from here. unprocessed_calls stays
// an empty array until one exists.

import { createClient } from "npm:@supabase/supabase-js@2";
import { copenhagenDay, isCloseoutHour } from "./time.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type TaskRow = { id: string; title: string; priority: number; due_date: string | null; status: string };

Deno.serve(async (req) => {
  const { data: ok, error: authErr } = await supabase.rpc("closeout_secret_ok", {
    candidate: req.headers.get("x-closeout-secret") ?? "",
  });
  if (authErr) return json({ error: authErr.message }, 500);
  if (!ok) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const day = copenhagenDay(new Date());
  // Cron fires at 13:30 and 14:30 UTC; only the 15:xx Copenhagen run counts.
  if (!body.force && !isCloseoutHour(day)) {
    return json({ ok: true, skipped: true, date: day.date, copenhagen_hour: day.hour });
  }

  try {
    const [doneRes, openRes] = await Promise.all([
      // The status-change log, not updated_at: any later edit to a done task
      // bumps updated_at and would count it as finished again.
      supabase
        .from("task_events")
        .select("created_at, tasks(id, title, priority, due_date, status)")
        .eq("event_type", "status_changed")
        .eq("new_value", "done")
        .gte("created_at", day.dayStartUtc)
        .order("created_at", { ascending: true }),
      supabase
        .from("tasks")
        .select("id, title, priority, due_date")
        .eq("status", "open")
        .lte("due_date", day.date)
        .order("priority", { ascending: true })
        .order("due_date", { ascending: true }),
    ]);
    if (doneRes.error) throw doneRes.error;
    if (openRes.error) throw openRes.error;

    // One entry per task, and only if it is still done (it may have been reopened).
    const completed = new Map<string, Omit<TaskRow, "status"> & { completed_at: string }>();
    for (const ev of doneRes.data ?? []) {
      const t = ev.tasks as unknown as TaskRow | null;
      if (!t || t.status !== "done") continue;
      const { status: _status, ...task } = t;
      completed.set(t.id, { ...task, completed_at: ev.created_at });
    }
    const completedTasks = [...completed.values()];
    const pendingTasks = openRes.data ?? [];

    const summary = [
      `Completed ${plural(completedTasks.length, "task")}.`,
      `${plural(pendingTasks.length, "task")} still open for today or overdue.`,
      "Calls not connected.",
    ].join(" ");

    const { error: upsertErr } = await supabase.from("daily_closeouts").upsert(
      {
        date: day.date,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        unprocessed_calls: [],
        summary,
        created_at: new Date().toISOString(),
      },
      { onConflict: "date" },
    );
    if (upsertErr) throw upsertErr;

    return json({
      ok: true,
      date: day.date,
      summary,
      completed_count: completedTasks.length,
      pending_count: pendingTasks.length,
    });
  } catch (err) {
    console.error("closeout failed:", err);
    return json({ error: (err as { message?: string }).message ?? String(err) }, 500);
  }
});
