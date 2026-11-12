/**
 * Formats an ISO timestamp (treating timezone-naive backend timestamps as UTC)
 * into a concise relative string like "Just now", "2 min ago", "1 hr ago", "3 days ago".
 */
export function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const normalized = /[Z+-]\d{2}:?\d{2}$|Z$/i.test(isoString) ? isoString : `${isoString}Z`;
  const then = new Date(normalized).getTime();
  if (Number.isNaN(then)) return '';

  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'Just now';

  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  if (hrs < 24) return `${hrs} hrs ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;

  return new Date(then).toLocaleDateString();
}

