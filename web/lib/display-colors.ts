/** Retain team/compound identification with a small luminance adjustment for the dark display. */
export function instrumentColor(hex: string): string {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return '#a7aaad';
  const channels = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  return '#' + channels.map(channel => Math.round(channel * 0.82 + 151 * 0.18).toString(16).padStart(2, '0')).join('');
}
