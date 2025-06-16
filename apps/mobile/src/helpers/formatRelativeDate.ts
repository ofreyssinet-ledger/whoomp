export function formatRelativeDate(input: Date | string | number): string {
  const date = new Date(input);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const msInDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((today.getTime() - target.getTime()) / msInDay);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

// Usage examples:
console.log(formatRelativeDate(new Date())); // "today"
console.log(formatRelativeDate(Date.now() - 86400000)); // "yesterday"
console.log(formatRelativeDate('2025-06-10')); // "June 10"
