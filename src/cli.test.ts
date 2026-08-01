import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const td = (cmd: string) => {
  const result = execSync(`npx tsx src/cli.ts ${cmd}`, {
    cwd: import.meta.dirname ? import.meta.dirname + "/.." : process.cwd(),
    env: { ...process.env },
    encoding: "utf-8",
    timeout: 10_000,
  });
  return result.trim();
};

const tdJson = <T>(cmd: string): T => JSON.parse(td(`${cmd} --json`));

describe("td CLI", () => {
  let testTaskId: string;

  it("add: creates a task with priority and due date", () => {
    const out = td('add "CLI test task" -p 2 --due 2026-04-01');
    assert.match(out, /^Created [a-f0-9]{8}: CLI test task$/);
    testTaskId = out.split(" ")[1].replace(":", "");
  });

  it("add --json: returns full task object", () => {
    const task = tdJson<{ id: string; title: string; priority: number; due_date: string; status: string }>(
      'add "CLI test json" -p 0 --due 2026-04-15',
    );
    assert.equal(task.title, "CLI test json");
    assert.equal(task.priority, 0);
    assert.equal(task.due_date, "2026-04-15");
    assert.equal(task.status, "open");
    // Clean up
    td(`done ${task.id.slice(0, 8)}`);
  });

  it("list: shows tasks", () => {
    const out = td("list");
    assert.match(out, /task/i);
  });

  it("list --today: filters to today's tasks", () => {
    const out = td("list --today");
    // Either shows tasks or "No tasks due today."
    assert.ok(out.length > 0);
  });

  it("list --json: returns array", () => {
    const tasks = tdJson<unknown[]>("list");
    assert.ok(Array.isArray(tasks));
  });

  it("show: displays task details", () => {
    const out = td(`show ${testTaskId}`);
    assert.match(out, /CLI test task/);
    assert.match(out, /P2/);
    assert.match(out, /open/);
  });

  it("show --json: returns task with labels", () => {
    const task = tdJson<{ title: string; labels: string[] }>(`show ${testTaskId}`);
    assert.equal(task.title, "CLI test task");
    assert.ok(Array.isArray(task.labels));
  });

  it("done: marks task complete", () => {
    const out = td(`done ${testTaskId}`);
    assert.match(out, /^Done: [a-f0-9]{8} CLI test task$/);
  });

  it("done: idempotent on already-done task", () => {
    const out = td(`done ${testTaskId}`);
    assert.match(out, /Already done/);
  });

  it("show: reflects done status", () => {
    const task = tdJson<{ status: string }>(`show ${testTaskId}`);
    assert.equal(task.status, "done");
  });

  it("add: completes in under 5 seconds", () => {
    const start = Date.now();
    td('add "Latency test" -p 4');
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 5000, `td add took ${elapsed}ms (limit: 5000ms)`);
  });
});
