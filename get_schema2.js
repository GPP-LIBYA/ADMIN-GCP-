import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function check() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const data = await res.json();
  console.log('Keys:', Object.keys(data));
  if (data.components && data.components.schemas) {
    console.log('Schemas:', Object.keys(data.components.schemas));
    console.log('analyses columns:', data.components.schemas.analyses?.properties);
  }
}
check();
