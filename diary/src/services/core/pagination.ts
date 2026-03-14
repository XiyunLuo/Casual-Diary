import type { PageResult } from "@/types/common";

export function toPageResult<T>(
  items: T[],
  total: number,
  pageSize: number,
): PageResult<T> {
  return {
    items,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
