-- Run this first in Supabase SQL Editor
create extension if not exists "uuid-ossp";

create table if not exists public.evaluations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  office_visited text not null,
  service_availed text not null,
  client_type text not null,
  sex text,
  cc1 int default 0,
  cc2 int default 0,
  cc3 int default 0,
  ratings jsonb default '{}'::jsonb,
  mean_score numeric(5,2),
  commendations text,
  suggestions text,
  type text default 'evaluation'
);

alter table public.evaluations enable row level security;

-- Public form can insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evaluations'
      AND policyname = 'Allow public evaluation submission'
  ) THEN
    CREATE POLICY "Allow public evaluation submission" ON public.evaluations
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Admin can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evaluations'
      AND policyname = 'Allow admin read evaluations'
  ) THEN
    CREATE POLICY "Allow admin read evaluations" ON public.evaluations
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      );
  END IF;
END $$;

-- Quick check
select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'evaluations';
