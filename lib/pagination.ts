export const DEFAULT_PAGE_SIZE = 25;

export function parsePageParam(page: string | undefined): number {
  const parsed = Number(page);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export function paginationMeta(page: number, totalCount: number, pageSize = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
