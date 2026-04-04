-- Schema for Web-Based Customer Satisfaction Feedback System
-- Bohol Island State University (BISU) - Calape Campus

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feedbacks Table
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    office_visited TEXT NOT NULL,
    service_availed TEXT NOT NULL,
    client_type TEXT NOT NULL,
    sex TEXT,
    
    -- Citizen's Charter (CC) Awareness
    cc1 INT DEFAULT 0,
    cc2 INT DEFAULT 0,
    cc3 INT DEFAULT 0,

    -- Dynamic Likert Scale Ratings (JSONB for flexibility)
    ratings JSONB DEFAULT '{}'::jsonb,
    
    -- Calculated mean score
    mean_score NUMERIC(5, 2),
    
    -- Additional text fields
    commendations TEXT,
    suggestions TEXT,
    type TEXT DEFAULT 'feedback'
);

-- Settings Table (for dynamic offices/dimensions)
CREATE TABLE IF NOT EXISTS admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID REFERENCES feedbacks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Complainant Details (Optional for anonymity, though form shows fields)
    name TEXT,
    address TEXT,
    sex TEXT,
    age INT,
    civil_status TEXT,
    contact_details TEXT,
    
    -- Complaint Details
    date_of_incident DATE,
    time_of_incident TIME,
    place_of_incident TEXT,
    details_of_complaint TEXT NOT NULL,
    narrative_report TEXT NOT NULL,
    
    -- Outcome
    desired_outcome TEXT NOT NULL,
    
    -- Status tracking for Admin
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved'))
);

-- Real-time settings for Supabase
-- If using Supabase UI, you would enable real-time replication for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;

-- Row Level Security (RLS) Policies
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public submission)
CREATE POLICY "Allow public feedback submission" ON feedbacks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public complaint submission" ON complaints
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users (Admins) to read
CREATE POLICY "Allow authenticated read feedbacks" ON feedbacks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read complaints" ON complaints
    FOR SELECT USING (auth.role() = 'authenticated');
