export const PLAN_LIMITS = {
  FREE: { memberLimit: 5, projectLimit: 3, storageGB: 1 },
  PRO: { memberLimit: 25, projectLimit: 20, storageGB: 10 },
  BUSINESS: { memberLimit: 200, projectLimit: 100, storageGB: 100 },
} as const;
