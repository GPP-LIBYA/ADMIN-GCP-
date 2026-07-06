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
