/**
 * Centralized Redis key builders (Phase 13).
 * Versioned catalog keys enable broad invalidation without KEYS * scans.
 */
export const CacheKeys = {
  catalogVersion: () => 'catalog:version',
  catalogList: (version: number, hash: string) => `catalog:list:v${version}:${hash}`,
  bookDetail: (id: string) => `book:detail:${id}`,
  bookListings: (id: string) => `book:listings:${id}`,
  categories: () => 'catalog:categories',
  adminStats: () => 'admin:stats',
  sellerStatus: (id: string) => `seller:status:${id}`,
  sellerDashboard: (id: string) => `seller:dashboard:${id}`,
  authRefresh: (userId: string) => `auth:refresh:${userId}`,
} as const;

export const CacheTTL = {
  CATALOG_LIST: 120,
  BOOK_DETAIL: 600,
  CATEGORIES: 300,
  ADMIN_STATS: 60,
  SELLER_STATUS: 300,
  SELLER_DASHBOARD: 45,
} as const;


