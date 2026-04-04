BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        WHERE p.pubname = 'supabase_realtime'
          AND c.relname = 'feedbacks'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE feedbacks';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        WHERE p.pubname = 'supabase_realtime'
          AND c.relname = 'complaints'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE complaints';
    END IF;
END $$;

DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE feedbacks (
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
    type TEXT DEFAULT 'feedback'
);

CREATE TABLE admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE admin_users (
    user_id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID REFERENCES feedbacks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT,
    address TEXT,
    sex TEXT,
    age INT,
    civil_status TEXT,
    contact_details TEXT,
    date_of_incident DATE,
    time_of_incident TIME,
    place_of_incident TEXT,
    details_of_complaint TEXT NOT NULL,
    narrative_report TEXT NOT NULL,
    desired_outcome TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved'))
);

ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public feedback submission" ON feedbacks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public complaint submission" ON complaints
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin read feedbacks" ON feedbacks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

CREATE POLICY "Allow admin read complaints" ON complaints
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

CREATE POLICY "Allow public read admin settings" ON admin_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow admin write admin settings" ON admin_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

CREATE POLICY "Allow authenticated read own admin mapping" ON admin_users
    FOR SELECT USING (user_id = auth.uid());

COMMIT;
