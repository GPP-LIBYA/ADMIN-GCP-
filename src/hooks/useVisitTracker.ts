import { useEffect, useRef } from 'react';

const getBrowserInfo = (userAgent: string) => {
  let browser_name = 'Unknown';
  let browser_version = 'Unknown';
  
  if (userAgent.includes('Firefox/')) {
    browser_name = 'Firefox';
    browser_version = userAgent.split('Firefox/')[1].split(' ')[0];
  } else if (userAgent.includes('Edg/')) {
    browser_name = 'Edge';
    browser_version = userAgent.split('Edg/')[1].split(' ')[0];
  } else if (userAgent.includes('Chrome/')) {
    browser_name = 'Chrome';
    browser_version = userAgent.split('Chrome/')[1].split(' ')[0];
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browser_name = 'Safari';
    browser_version = userAgent.split('Version/')[1]?.split(' ')[0] || 'Unknown';
  }

  let operating_system = 'Unknown';
  if (userAgent.includes('Win')) operating_system = 'Windows';
  else if (userAgent.includes('Mac')) operating_system = 'MacOS';
  else if (userAgent.includes('X11')) operating_system = 'UNIX';
  else if (userAgent.includes('Linux')) operating_system = 'Linux';
  else if (userAgent.includes('Android')) operating_system = 'Android';
  else if (userAgent.includes('like Mac OS X')) operating_system = 'iOS';

  let device_type = 'Desktop';
  if (/Mobi|Android/i.test(userAgent)) device_type = 'Mobile';
  if (/Tablet|iPad/i.test(userAgent)) device_type = 'Tablet';

  return { browser_name, browser_version, operating_system, device_type };
};

export const useVisitTracker = () => {
  const isTracked = useRef(false);

  useEffect(() => {
    if (isTracked.current) return;
    
    let sessionId = sessionStorage.getItem('gcp_session_id');
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('gcp_session_id', sessionId);
      isTracked.current = true;
      
      const trackVisit = async () => {
        try {
          const { browser_name, browser_version, operating_system, device_type } = getBrowserInfo(navigator.userAgent);
          
          const payload = {
            device_type,
            browser_name,
            browser_version,
            operating_system,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            language: navigator.language,
            page_path: window.location.pathname,
            referrer: document.referrer || null,
            session_id: sessionId,
            user_agent: navigator.userAgent
          };

          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/track-visit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify(payload)
            });
            
            if (res.ok) {
              const result = await res.json();
              console.log('Visit tracked successfully via Edge Function. Data:', result.data);
            } else {
              const errText = await res.text();
              console.warn('Failed to track visit via Edge Function. Response:', errText);
            }
          } else {
            console.warn('Supabase URL or Key is missing.');
          }
        } catch (error) {
          console.warn('Failed to track visit:', error);
        }
      };

      trackVisit();
    }
  }, []);
};
