export const formatAdminDate = (date: string | Date | null | undefined) => {
  if (!date) return '---';

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
};

export const formatAdminDateTime = (date: string | Date | null | undefined) => {
  if (!date) return '---';

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date));
};

export const getDayKey = (dateVal: string | Date | null | undefined): string => {
  if (!dateVal) return 'unknown';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'unknown';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDayBounds = (dateVal: string | Date = new Date()): { startISO: string; endISO: string; dayKey: string } => {
  const d = new Date(dateVal);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const dayKey = getDayKey(d);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    dayKey,
  };
};

