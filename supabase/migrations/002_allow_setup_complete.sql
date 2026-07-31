-- Apply after 001_installation_telemetry.sql for existing Supabase projects.
alter table public.installation_events
  drop constraint if exists installation_events_event_type_check;

alter table public.installation_events
  add constraint installation_events_event_type_check
  check (event_type in ('installed', 'startup', 'setup_complete', 'dashboard_login'));
