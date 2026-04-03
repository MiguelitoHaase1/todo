/**
 * Task insert deduplication helpers.
 *
 * When capturing tasks from Discord or iMessage, multiple Claude Code sessions
 * may process the same message simultaneously. Passing a source_message_id
 * (the platform's native message ID) lets Supabase silently ignore the second
 * insert via a unique constraint — no duplicate tasks, no errors.
 */

export interface InsertOptions {
  /** Appended to the table URL: "?on_conflict=source_message_id" or "" */
  urlSuffix: string;
  /** Value for the PostgREST Prefer header */
  prefer: string;
  /** Payload to POST — may include source_message_id */
  body: Record<string, unknown>;
}

/**
 * Build fetch options for a task POST.
 *
 * Without sourceMessageId: plain insert.
 * With sourceMessageId: upsert with ignore-duplicates semantics.
 * The Supabase server returns an empty array when the row was silently skipped.
 */
export function buildTaskInsertOptions(
  data: Record<string, unknown>,
  sourceMessageId?: string,
): InsertOptions {
  if (!sourceMessageId) {
    return {
      urlSuffix: "",
      prefer: "return=representation",
      body: data,
    };
  }

  return {
    urlSuffix: "?on_conflict=source_message_id",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { ...data, source_message_id: sourceMessageId },
  };
}

/**
 * Returns true when Supabase responded with an empty array,
 * meaning the row was a duplicate and was silently ignored.
 */
export function isDuplicateIgnored(rows: unknown[]): boolean {
  return Array.isArray(rows) && rows.length === 0;
}
