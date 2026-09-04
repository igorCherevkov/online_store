export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const normalizePagination = (
  page?: number,
  limit?: number,
): NormalizedPagination => {
  const safePage = Math.max(1, page ?? 1);
  const safeLimit = Math.min(Math.max(1, limit ?? 20), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

export const buildResult = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> => {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
