const time = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Seoul',
});
const date = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Seoul',
});
export const formatTime = (value) =>
  Number.isFinite(Date.parse(value)) ? time.format(new Date(value)) : '—';
export const formatDate = (value) =>
  Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : '—';
