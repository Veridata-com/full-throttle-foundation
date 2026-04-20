import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  tagline: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  default_cta: string | null;
  story_style_history: string[];
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  current: Workspace | null;
  loading: boolean;
  setCurrentId: (id: string) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const STORAGE_KEY = "adrise:current_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setWorkspaces([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("workspaces").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    const list = (data as any as Workspace[]) || [];
    setWorkspaces(list);
    setLoading(false);
    setCurrentIdState((prev) => {
      if (prev && list.some((w) => w.id === prev)) return prev;
      const first = list[0]?.id || null;
      if (first) localStorage.setItem(STORAGE_KEY, first);
      return first;
    });
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const setCurrentId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentIdState(id);
  };

  const current = workspaces.find((w) => w.id === currentId) || null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, current, loading, setCurrentId, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
