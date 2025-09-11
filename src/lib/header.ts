export default function header(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return;
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
