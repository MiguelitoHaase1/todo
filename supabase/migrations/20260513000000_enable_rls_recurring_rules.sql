-- Enable RLS on recurring_rules to clear the Supabase linter warning
-- (rls_disabled_in_public). Sibling tables (recurring_tasks, tasks, labels)
-- already use the same pattern: RLS on, no policies → service-role only.

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
