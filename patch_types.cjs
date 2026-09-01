const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace(
  /export interface SiteVisit \{[\s\S]*?\}/,
  `export interface SiteVisit {
  id: string;
  created_at: string;
  visitor_ip: string | null;
  device_type: string | null;
  browser_name: string | null;
  operating_system: string | null;
  screen_width: number | null;
  screen_height: number | null;
  language: string | null;
  page_path: string;
  referrer: string | null;
  session_id: string | null;
  user_agent: string | null;
}`
);
fs.writeFileSync('src/types.ts', content);
