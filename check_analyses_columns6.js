import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const fields = ['title', 'content', 'author', 'is_published', 'pdf_url', 'file_size', 'page_count', 'sector', 'report_date', 'tags', 'views_count', 'downloads_count', 'cover_image_url', 'status'];
  
  for (const field of fields) {
      const { error } = await supabase.from('analyses').update({ [field]: null }).eq('id', 1);
      if (error && error.code === 'PGRST204') {
          console.log(`Column ${field} missing`);
      } else if (error) {
          console.log(`Column ${field} error:`, error.message);
      } else {
          console.log(`Column ${field} exists!`);
      }
  }
}
check();
