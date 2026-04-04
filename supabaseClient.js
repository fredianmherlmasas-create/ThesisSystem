// supabaseClient.js
// Initialize Supabase configuration

// Replace these with your actual project values from Supabase > Project Settings > API.
const SUPABASE_URL = window.SUPABASE_URL || 'https://uqrzyowknvgwnczejqeb.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnp5b3drbnZnd25jemVqcWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTcyNTIsImV4cCI6MjA4NzgzMzI1Mn0.7cXCWcHsPvAYiL9krwKIeISPmDNfhT9MKKb8DD1AQzg';

function createSupabaseClient() {
    if (!window.supabase) {
        throw new Error('Supabase CDN is not loaded.');
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'REPLACE_WITH_SUPABASE_ANON_KEY') {
        throw new Error('Supabase keys are not configured in supabaseClient.js.');
    }

    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    });
}

window.supabaseReady = new Promise((resolve, reject) => {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.supabaseClient = createSupabaseClient();
            console.log('Supabase client initialized.');
            resolve(window.supabaseClient);
        } catch (error) {
            console.warn(error.message);
            reject(error);
        }
    });
});
