export type SearchParams = Record<string, string | string[] | undefined>;

// A URL can contain ?q=a&q=b. We only use the first value.
export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
