/** Bound the rendered list, not the stored history or notification counts. */
export function notificationPage<T>(items: readonly T[], requestedPage: number, size = 50) {
  const pageSize = Math.max(1, Math.min(100, Number.isFinite(size) ? Math.floor(size) : 50));
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(0, Math.min(pages - 1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  const start = page * pageSize;
  return { items: items.slice(start, start + pageSize), page, pages, total: items.length, from: items.length ? start + 1 : 0, to: Math.min(start + pageSize, items.length) };
}
