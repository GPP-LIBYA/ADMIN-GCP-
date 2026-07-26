import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('analyses').update({ title_ar: 'test' }).eq('id', '11111111-1111-1111-1111-111111111111');
  console.log('analyses update error:', error);
}
check();
