const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('useVisitTracker')) {
  // Insert import
  content = content.replace(
    /import \{ useAuthStore \} from '\.\/store\/authStore';/,
    `import { useAuthStore } from './store/authStore';\nimport { useVisitTracker } from './hooks/useVisitTracker';`
  );

  // Call hook in App
  content = content.replace(
    /export default function App\(\) \{/,
    `export default function App() {\n  useVisitTracker();`
  );

  fs.writeFileSync('src/App.tsx', content);
}
