// Morning snapshot: one row per Copenhagen weekday in public.morning_snapshots,
// precomputed at 06:30 so the morning briefing loads in one read. Called by
// pg_cron (see migration 20261011220000_morning_snapshots.sql).
//
// Not yet included, and why:
// - Calendar. Calendar Chat reads Google Calendar through Lovable's connector
//   gateway with keys only that Lovable project holds. This function cannot
//   use them, so the schedule is empty and the heads-up says so.
// - CRM matching. It matches meeting attendees, so it waits for the calendar.
// - Anchor goal. The recap app keeps the goal in chat and stores nothing.

import { createClient } from "npm:@supabase/supabase-js@2";
import { copenhagenDay } from "../_shared/time.ts";
import { buildPayload } from "./payload.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const TASK_FIELDS = "id, title, priority, due_date";

Deno.serve(async (req) => {
  const { data: ok, error: authErr } = await supabase.rpc("prewarmer_secret_ok", {
    candidate: req.headers.get("x-prewarmer-secret") ?? "",
  });
  if (authErr) return json({ error: authErr.message }, 500);
  if (!ok) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const day = copenhagenDay(new Date());
  // Cron fires at 04:30 and 05:30 UTC; only the 06:xx Copenhagen run counts.
  if (!body.force && day.hour !== 6) {
    return json({ ok: true, skipped: true, date: day.date, copenhagen_hour: day.hour });
  }

  try {
    const open = () => supabase.from("tasks").select(TASK_FIELDS).eq("status", "open");
    const [overdueRes, dueTodayRes, p0p1Res, closeoutRes] = await Promise.all([
      open().lt("due_date", day.date).order("due_date").order("priority"),
      open().eq("due_date", day.date).order("priority"),
      open().lte("priority", 1).order("priority").order("due_date", { nullsFirst: false }).limit(10),
      // The latest closeout before today, so Monday picks up Friday's.
      supabase.from("daily_closeouts").select("date, summary").lt("date", day.date)
        .order("date", { ascending: false }).limit(1).maybeSingle(),
    ]);
    for (const r of [overdueRes, dueTodayRes, p0p1Res, closeoutRes]) if (r.error) throw r.error;

    const payload = buildPayload({
      date: day.date,
      yesterday: closeoutRes.data ?? null,
      overdue: overdueRes.data ?? [],
      dueToday: dueTodayRes.data ?? [],
      p0p1: p0p1Res.data ?? [],
    });

    const { error: upsertErr } = await supabase
      .from("morning_snapshots")
      .upsert({ date: day.date, payload, created_at: new Date().toISOString() }, { onConflict: "date" });
    if (upsertErr) throw upsertErr;

    return json({
      ok: true,
      date: day.date,
      overdue: payload.tasks.overdue.length,
      due_today: payload.tasks.due_today.length,
      p0_p1: payload.tasks.p0_p1.length,
      headsup: payload.headsup,
    });
  } catch (err) {
    console.error("morning snapshot failed:", err);
    return json({ error: (err as { message?: string }).message ?? String(err) }, 500);
  }
});
