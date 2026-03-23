import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase project URL and anon key from the Supabase dashboard
// Go to Settings -> API to find these values.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ntcdwswelewwxmyuhbtr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Y2R3c3dlbGV3d3hteXVoYnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjI3OTYsImV4cCI6MjA4OTc5ODc5Nn0.uDD1BEW73kCvpfr3VnP3pqdpohIDoKpTvqk1rX9GFfQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
