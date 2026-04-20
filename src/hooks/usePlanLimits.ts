import { useAuth } from "@/contexts/AuthContext";

export const PLAN_LIMITS = {
  none: { slideshows: 0, images: 0 },
  starter: { slideshows: 50, images: 500 },
  pro: { slideshows: Infinity, images: Infinity },
} as const;

export function usePlanLimits() {
  const { profile } = useAuth();
  const plan = profile?.plan || "none";
  const limits = PLAN_LIMITS[plan];
  return {
    plan,
    limits,
    canGenerate: plan !== "none",
    isPro: plan === "pro",
    isStarter: plan === "starter",
  };
}
