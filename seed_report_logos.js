import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
// Using the service key or anon key to insert might fail if RLS is enabled for anon inserts without auth.
// I will just create a sql file for the user to execute instead of trying to run it through anon key.
