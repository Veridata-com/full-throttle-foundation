import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TiktokAccount {
  id: string;
  handle: string;
  label: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

const MAX_ACCOUNTS = 50;

export function TiktokAccountsManager({ onChange }: { onChange?: () => void }) {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [accounts, setAccounts] = useState<TiktokAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = async () => {
    if (!user || !current) return;
    setLoading(true);
    const { data } = await supabase
      .from("tiktok_accounts")
      .select("*")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: true });
    setAccounts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, current?.id]);

  const add = async () => {
    if (!user || !current) return;
    const handle = newHandle.trim().replace(/^@/, "");
    if (!handle) return;
    if (accounts.length >= MAX_ACCOUNTS) {
      toast.error(`Limit of ${MAX_ACCOUNTS} accounts per workspace`);
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("tiktok_accounts").insert({
      user_id: user.id,
      workspace_id: current.id,
      handle,
      label: newLabel.trim() || null,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setNewHandle(""); setNewLabel("");
    toast.success(`Added @${handle}`);
    await load();
    onChange?.();
  };

  const remove = async (id: string, handle: string) => {
    if (!confirm(`Remove @${handle}? Imported posts stay but won't be re-synced.`)) return;
    const { error } = await supabase.from("tiktok_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
    onChange?.();
  };

  const toggleEnabled = async (a: TiktokAccount) => {
    await supabase.from("tiktok_accounts").update({ sync_enabled: !a.sync_enabled }).eq("id", a.id);
    await load();
  };

  const syncOne = async (a: TiktokAccount) => {
    setSyncingId(a.id);
    try {
      const { data, error } = await supabase.functions.invoke("import-tiktok-posts", {
        body: { tiktok_account_id: a.id, limit: 30 },
      });
      if (error) throw error;
      const err = (data as any)?.error;
      if (err) toast.error(`@${a.handle}: ${err}`);
      else toast.success(`@${a.handle}: ${(data as any)?.imported ?? 0} new · ${(data as any)?.updated ?? 0} refreshed`);
      await load();
      onChange?.();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const syncAll = async () => {
    if (!current) return;
    setSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-all-tiktok-accounts", {
        body: { workspace_id: current.id, limit: 30 },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error === "no_accounts") {
        toast.error("No enabled accounts to sync");
      } else {
        toast.success(`Synced ${d.accounts} accounts · ${d.imported} new · ${d.updated} refreshed${d.failures ? ` · ${d.failures} failed` : ""}`);
      }
      await load();
      onChange?.();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncingAll(false);
    }
  };

  if (!current) return null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold">TikTok accounts</h2>
          <p className="text-sm text-muted-foreground">Connect up to {MAX_ACCOUNTS} TikTok handles. Sync them all in one click.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{accounts.length}/{MAX_ACCOUNTS}</Badge>
          <Button size="sm" onClick={syncAll} disabled={syncingAll || accounts.length === 0}>
            {syncingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync all
          </Button>
        </div>
      </div>

      {/* Add form */}
      {accounts.length < MAX_ACCOUNTS && (
        <div className="flex flex-wrap gap-2 items-center border-t border-border pt-4">
          <div className="flex items-center gap-1 flex-1 min-w-[180px]">
            <span className="text-muted-foreground">@</span>
            <Input value={newHandle} onChange={(e) => setNewHandle(e.target.value.replace(/^@/, ""))} placeholder="tiktokhandle" />
          </div>
          <Input className="flex-1 min-w-[180px]" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (optional, e.g. Brand A)" />
          <Button onClick={add} disabled={adding || !newHandle.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add account
          </Button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No accounts connected yet. Add one above to start tracking performance.</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium">@{a.handle}</span>
                  {a.label && <Badge variant="secondary" className="text-xs">{a.label}</Badge>}
                  {!a.sync_enabled && <Badge variant="outline" className="text-xs">paused</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  {a.last_sync_status === "failed" ? (
                    <><AlertCircle className="h-3 w-3 text-destructive" /> Last sync failed{a.last_sync_error ? `: ${a.last_sync_error.slice(0, 60)}` : ""}</>
                  ) : a.last_synced_at ? (
                    <><CheckCircle2 className="h-3 w-3 text-success" /> Synced {new Date(a.last_synced_at).toLocaleString()}</>
                  ) : (
                    "Never synced"
                  )}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggleEnabled(a)}>
                {a.sync_enabled ? "Pause" : "Resume"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => syncOne(a)} disabled={syncingId === a.id}>
                {syncingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id, a.handle)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
