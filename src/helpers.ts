export function asKey(value: string | number | boolean): string {
  return String(value)
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}
