import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

interface ReleaseNote {
  id: string;
  title: string;
  body: string | null;
  status: "shipped" | "upcoming";
  version: string | null;
  sort_order: number;
  published_at: string;
}
interface Update { id: string; release_note_id: string; body: string; created_at: string; }

export default function AdminReleaseNotes() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [updates, setUpdates] = useState<Record<string, Update[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: n }, { data: u }] = await Promise.all([
      supabase.from("release_notes").select("*").order("status").order("sort_order").order("published_at", { ascending: false }),
      supabase.from("release_note_updates").select("*").order("created_at", { ascending: false }),
    ]);
    setNotes((n as ReleaseNote[]) || []);
    const map: Record<string, Update[]> = {};
    (u as Update[] || []).forEach((x) => { (map[x.release_note_id] ||= []).push(x); });
    setUpdates(map);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (adminLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const create = async (status: "shipped" | "upcoming") => {
    const { error } = await supabase.from("release_notes").insert({ title: "Untitled", status });
    if (error) { toast.error(error.message); return; }
    toast.success(`New ${status} entry created`);
    load();
  };

  return (
    <>
      <SEO title="Manage release notes — AdRise" description="Admin: create and edit release notes, roadmap, and progress updates." />
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Release notes admin</h1>
            <p className="text-muted-foreground">Create, edit and delete release notes, upcoming items and updates.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => create("upcoming")}><Plus className="h-4 w-4" />Coming soon</Button>
            <Button onClick={() => create("shipped")}><Plus className="h-4 w-4" />Shipped entry</Button>
          </div>
        </div>

        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
          <div className="space-y-4">
            {notes.length === 0 && <Card className="p-8 text-center text-muted-foreground">No release notes yet — create your first.</Card>}
            {notes.map((n) => (
              <NoteEditor key={n.id} note={n} updates={updates[n.id] || []} reload={load} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function NoteEditor({ note, updates, reload }: { note: ReleaseNote; updates: Update[]; reload: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body || "");
  const [status, setStatus] = useState(note.status);
  const [version, setVersion] = useState(note.version || "");
  const [sortOrder, setSortOrder] = useState(String(note.sort_order));
  const [saving, setSaving] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("release_notes").update({
      title: title.trim() || "Untitled",
      body: body || null,
      status,
      version: version || null,
      sort_order: parseInt(sortOrder) || 0,
    }).eq("id", note.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    reload();
  };

  const remove = async () => {
    if (!confirm("Delete this release note and all its updates and comments?")) return;
    const { error } = await supabase.from("release_notes").delete().eq("id", note.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    reload();
  };

  const addUpdate = async () => {
    if (!newUpdate.trim()) return;
    setPostingUpdate(true);
    const { error } = await supabase.from("release_note_updates").insert({
      release_note_id: note.id,
      body: newUpdate.trim(),
    });
    setPostingUpdate(false);
    if (error) { toast.error(error.message); return; }
    setNewUpdate("");
    toast.success("Update added");
    reload();
  };

  const removeUpdate = async (id: string) => {
    const { error } = await supabase.from("release_note_updates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Badge className={status === "shipped" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"} variant="outline">
          {status === "shipped" ? "Shipped" : "Coming"}
        </Badge>
        <span className="text-xs text-muted-foreground">{new Date(note.published_at).toLocaleDateString()}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v: "shipped" | "upcoming") => setStatus(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Coming soon</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Version (optional)</Label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. v0.4" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Sort order (lower = first)</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button>
        <Button variant="outline" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Progress updates</p>
        <div className="space-y-2 mb-3">
          {updates.map((u) => (
            <div key={u.id} className="flex items-start gap-2 rounded border p-2 text-sm">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                <p className="whitespace-pre-wrap">{u.body}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeUpdate(u.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {updates.length === 0 && <p className="text-xs text-muted-foreground">No updates yet.</p>}
        </div>
        <div className="flex gap-2">
          <Textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="Add a progress update…" rows={2} />
          <Button onClick={addUpdate} disabled={postingUpdate || !newUpdate.trim()}>
            {postingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
