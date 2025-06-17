export function formatRelativeDate(
  input: Date | string | number,
  withTime = false,
): string {
  const date = new Date(input);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const msInDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((today.getTime() - target.getTime()) / msInDay);

  let dayString;

  if (diffDays === 0) dayString = 'Today';
  else if (diffDays === 1) dayString = 'Yesterday';
  else {
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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayString = `${dayNames[date.getDay()]}, ${
      monthNames[date.getMonth()]
    } ${date.getDate()}`;
  }

  return (
    dayString +
    (withTime
      ? ` at ${date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : '')
  );
}
