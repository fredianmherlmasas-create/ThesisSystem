-- One-time migration: separate evaluations from legacy feedbacks
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    office_visited TEXT NOT NULL,
    service_availed TEXT NOT NULL,
    client_type TEXT NOT NULL,
    sex TEXT,

    cc1 INT DEFAULT 0,
    cc2 INT DEFAULT 0,
    cc3 INT DEFAULT 0,

    ratings JSONB DEFAULT '{}'::jsonb,
    mean_score NUMERIC(5, 2),

    commendations TEXT,
    suggestions TEXT,
    type TEXT DEFAULT 'evaluation'
);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Public insert for evaluation form submissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'evaluations'
          AND policyname = 'Allow public evaluation submission'
    ) THEN
        CREATE POLICY "Allow public evaluation submission" ON evaluations
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Admin read for dashboard
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'evaluations'
          AND policyname = 'Allow admin read evaluations'
    ) THEN
        CREATE POLICY "Allow admin read evaluations" ON evaluations
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM admin_users au
                    WHERE au.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Optional realtime support
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication p
        WHERE p.pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE evaluations';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Copy legacy data if feedbacks exists and rows are not yet present in evaluations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'feedbacks'
    ) THEN
        INSERT INTO evaluations (
            id,
            created_at,
            office_visited,
            service_availed,
            client_type,
            sex,
            cc1,
            cc2,
            cc3,
            ratings,
            mean_score,
            commendations,
            suggestions,
            type
        )
        SELECT
            f.id,
            f.created_at,
            f.office_visited,
            f.service_availed,
            f.client_type,
            f.sex,
            f.cc1,
            f.cc2,
            f.cc3,
            f.ratings,
            f.mean_score,
            f.commendations,
            f.suggestions,
            'evaluation'
        FROM feedbacks f
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

COMMIT;
