import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const fields = ['id', 'title_ar', 'title_en', 'description_ar', 'description_en', 'sector', 'tags', 'report_date', 'status', 'cover_image_url', 'pdf_url', 'file_size', 'page_count', 'uploaded_by', 'views_count', 'downloads_count', 'created_at', 'updated_at', 'title', 'content', 'author', 'asset_symbol', 'is_published'];
  for (const field of fields) {
      const { error } = await supabase.from('analyses').update({ [field]: null }).eq('id', 1);
      if (error && error.code === 'PGRST204') {
          console.log(`Column ${field} missing`);
      } else {
          console.log(`Column ${field} exists!`);
      }
  }
}
check();
