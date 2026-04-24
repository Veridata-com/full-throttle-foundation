import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "hermansmanasse@gmail.com";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      // Fallback: hardcoded email check (DB role is the source of truth, but this gives instant access on first login)
      const emailMatch = (user.email || "").toLowerCase() === ADMIN_EMAIL;
      setIsAdmin(!!data || emailMatch);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { isAdmin, loading };
}
