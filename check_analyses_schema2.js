import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('analyses').select('*').limit(1);
  console.log('analyses data:', data);
  if (data && data.length > 0) {
    console.log('Keys:', Object.keys(data[0]));
  }
}
check();
