import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { ArrowLeft, MessageSquare, Loader2, Rocket, Hourglass, Pencil, Trash2, Plus, Save, X, Upload, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface ReleaseNote {
  id: string;
  title: string;
  body: string | null;
  status: "shipped" | "upcoming";
  version: string | null;
  sort_order: number;
  published_at: string;
  media_url: string | null;
  media_type: string | null;
}
interface Update { id: string; release_note_id: string; body: string; created_at: string; media_url: string | null; media_type: string | null; }
interface Comment { id: string; release_note_id: string; author_name: string | null; body: string; created_at: string; }

const BUCKET = "release-media";

async function uploadMedia(file: File): Promise<{ url: string; type: "image" | "video" } | null> {
  if (file.size > 50 * 1024 * 1024) { toast.error("Max 50MB"); return null; }
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) { toast.error(error.message); return null; }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, type: file.type.startsWith("video/") ? "video" : "image" };
}

function Media({ url, type }: { url: string; type: string | null }) {
  if (type === "video") return <video src={url} controls className="rounded-lg max-h-80 w-auto border" />;
  return <img src={url} alt="" loading="lazy" className="rounded-lg max-h-80 w-auto border" />;
}

function MediaUploader({ url, type, onChange }: {
  url: string | null; type: string | null;
  onChange: (v: { url: string | null; type: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-2">
      {url && (
        <div className="relative inline-block rounded-lg overflow-hidden border max-w-xs">
          <Media url={url} type={type} />
          <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6"
            onClick={() => onChange({ url: null, type: null })}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          setUploading(true);
          const res = await uploadMedia(f);
          setUploading(false);
          if (res) onChange({ url: res.url, type: res.type });
        }} />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {url ? "Replace" : "Upload image / video"}
        </Button>
        <span className="text-xs text-muted-foreground">PNG/JPG/MP4 · 50MB max</span>
      </div>
    </div>
  );
}

const commentSchema = z.object({
  author_name: z.string().trim().max(60).optional(),
  body: z.string().trim().min(2, "Comment too short").max(2000),
});

export default function ReleaseNotes() {
  const { isAdmin } = useIsAdmin();
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [updates, setUpdates] = useState<Record<string, Update[]>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: n }, { data: u }, { data: c }] = await Promise.all([
      supabase.from("release_notes").select("*").order("status", { ascending: true }).order("sort_order").order("published_at", { ascending: false }),
      supabase.from("release_note_updates").select("*").order("created_at", { ascending: false }),
      supabase.from("release_note_comments").select("*").order("created_at", { ascending: false }),
    ]);
    setNotes((n as ReleaseNote[]) || []);
    const upMap: Record<string, Update[]> = {};
    (u as Update[] || []).forEach((x) => { (upMap[x.release_note_id] ||= []).push(x); });
    setUpdates(upMap);
    const cMap: Record<string, Comment[]> = {};
    (c as Comment[] || []).forEach((x) => { (cMap[x.release_note_id] ||= []).push(x); });
    setComments(cMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createNew = async (status: "shipped" | "upcoming") => {
    const { error } = await supabase.from("release_notes").insert({ title: "Untitled", status });
    if (error) { toast.error(error.message); return; }
    toast.success(`New ${status} entry added`);
    load();
  };

  const shipped = notes.filter((n) => n.status === "shipped");
  const upcoming = notes.filter((n) => n.status === "upcoming");

  return (
    <>
      <SEO title="Release notes & roadmap — AdRise" description="What's shipped, what's coming, and how AdRise is improving based on your feedback." canonical="/release-notes" />
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-display text-xl font-bold">AdRise</span>
            </Link>
            <div className="flex items-center gap-2">
              <FeedbackDialog variant="outline" size="sm" />
              <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4" />Home</Link></Button>
            </div>
          </div>
        </header>

        <section className="container py-12 max-w-3xl">
          <Badge className="mb-3 bg-primary/15 text-primary border border-primary/30">Early beta</Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Release notes & roadmap</h1>
          <p className="text-muted-foreground text-lg">
            We're shipping rapidly based on user feedback. Browse what's live, see what's coming, and leave a comment — anonymous is fine.
          </p>
          {isAdmin && (
            <div className="mt-5 flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground self-center mr-1">Admin</span>
              <Button size="sm" variant="outline" onClick={() => createNew("upcoming")}><Plus className="h-4 w-4" />Add coming-soon</Button>
              <Button size="sm" onClick={() => createNew("shipped")}><Plus className="h-4 w-4" />Add shipped entry</Button>
            </div>
          )}
        </section>

        {loading ? (
          <div className="container max-w-3xl py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Section title="What's coming" icon={<Hourglass className="h-5 w-5" />} empty="Nothing planned publicly yet — give feedback to shape the roadmap.">
              {upcoming.map((n) => (
                <NoteCard key={n.id} note={n} updates={updates[n.id] || []} comments={comments[n.id] || []} onChange={load} isAdmin={isAdmin} />
              ))}
            </Section>
            <Section title="Shipped" icon={<Rocket className="h-5 w-5" />} empty="No releases yet. Check back soon.">
              {shipped.map((n) => (
                <NoteCard key={n.id} note={n} updates={updates[n.id] || []} comments={comments[n.id] || []} onChange={load} isAdmin={isAdmin} />
              ))}
            </Section>
          </>
        )}

        <footer className="border-t py-12 mt-12">
          <div className="container text-center text-sm text-muted-foreground">© {new Date().getFullYear()} AdRise</div>
        </footer>
      </div>
    </>
  );
}

function Section({ title, icon, children, empty }: { title: string; icon: React.ReactNode; children: React.ReactNode; empty: string }) {
  const arr = Array.isArray(children) ? children : [children];
  const hasContent = arr.filter(Boolean).length > 0;
  return (
    <section className="container max-w-3xl py-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">{icon}</div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
      </div>
      {hasContent ? <div className="space-y-4">{children}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}

function NoteCard({ note, updates, comments, onChange, isAdmin }: {
  note: ReleaseNote; updates: Update[]; comments: Comment[]; onChange: () => void; isAdmin: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const post = async () => {
    const parsed = commentSchema.safeParse({ author_name: name, body });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || "Invalid"); return; }
    setPosting(true);
    const { error } = await supabase.from("release_note_comments").insert({
      release_note_id: note.id,
      author_name: parsed.data.author_name || null,
      body: parsed.data.body,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setBody("");
    toast.success("Comment posted");
    onChange();
  };

  const remove = async () => {
    if (!confirm("Delete this entry, all its updates and comments?")) return;
    const { error } = await supabase.from("release_notes").delete().eq("id", note.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onChange();
  };

  if (editing) {
    return <NoteEditor note={note} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChange(); }} />;
  }

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {note.version && <Badge variant="outline" className="font-mono text-[10px]">{note.version}</Badge>}
            <Badge className={note.status === "shipped" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"} variant="outline">
              {note.status === "shipped" ? "Shipped" : "Coming"}
            </Badge>
          </div>
          <h3 className="font-display text-xl font-bold">{note.title}</h3>
          <p className="text-xs text-muted-foreground">{new Date(note.published_at).toLocaleDateString()}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </div>
      {note.body && <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-2">{note.body}</p>}
      {note.media_url && <div className="mt-3"><Media url={note.media_url} type={note.media_type} /></div>}

      {updates.length > 0 && (
        <div className="mt-4 border-l-2 border-primary/40 pl-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress updates</p>
          {updates.map((u) => (
            <UpdateRow key={u.id} update={u} isAdmin={isAdmin} onChange={onChange} />
          ))}
        </div>
      )}

      {isAdmin && <AddUpdateForm noteId={note.id} onAdded={onChange} />}

      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setShowComments((s) => !s)}>
          <MessageSquare className="h-4 w-4" />
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </Button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2 rounded-lg bg-muted/40 p-3">
            <Input placeholder="Name (optional, leave blank for anonymous)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <Textarea placeholder="Share your thoughts…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} />
            <div className="flex justify-end">
              <Button size="sm" onClick={post} disabled={posting}>
                {posting && <Loader2 className="h-4 w-4 animate-spin" />}Post comment
              </Button>
            </div>
          </div>
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">{c.author_name?.trim() || "Anonymous"}</span> · {new Date(c.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Be the first to comment.</p>}
        </div>
      )}
    </Card>
  );
}

function NoteEditor({ note, onClose, onSaved }: { note: ReleaseNote; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body || "");
  const [status, setStatus] = useState<"shipped" | "upcoming">(note.status);
  const [version, setVersion] = useState(note.version || "");
  const [sortOrder, setSortOrder] = useState(String(note.sort_order));
  const [mediaUrl, setMediaUrl] = useState<string | null>(note.media_url);
  const [mediaType, setMediaType] = useState<string | null>(note.media_type);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("release_notes").update({
      title: title.trim() || "Untitled",
      body: body || null,
      status,
      version: version || null,
      sort_order: parseInt(sortOrder) || 0,
      media_url: mediaUrl,
      media_type: mediaType,
    }).eq("id", note.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onSaved();
  };

  return (
    <Card className="p-6 shadow-card border-primary/40">
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
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Image / video (optional)</Label>
          <MediaUploader url={mediaUrl} type={mediaType} onChange={(v) => { setMediaUrl(v.url); setMediaType(v.type); }} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button>
        <Button variant="outline" onClick={onClose}><X className="h-4 w-4" />Cancel</Button>
      </div>
    </Card>
  );
}

function UpdateRow({ update, isAdmin, onChange }: { update: Update; isAdmin: boolean; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(update.body);
  const [mediaUrl, setMediaUrl] = useState<string | null>(update.media_url);
  const [mediaType, setMediaType] = useState<string | null>(update.media_type);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("release_note_updates").update({
      body: body.trim(), media_url: mediaUrl, media_type: mediaType,
    }).eq("id", update.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEditing(false); onChange();
  };

  const remove = async () => {
    if (!confirm("Delete this update?")) return;
    const { error } = await supabase.from("release_note_updates").delete().eq("id", update.id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  if (editing) {
    return (
      <div className="rounded border p-3 space-y-2 bg-muted/30">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        <MediaUploader url={mediaUrl} type={mediaType} onChange={(v) => { setMediaUrl(v.url); setMediaType(v.type); }} />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4" />Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm space-y-2 group">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{new Date(update.created_at).toLocaleDateString()}</p>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={remove}><Trash2 className="h-3 w-3" /></Button>
          </div>
        )}
      </div>
      <p className="whitespace-pre-wrap">{update.body}</p>
      {update.media_url && <Media url={update.media_url} type={update.media_type} />}
    </div>
  );
}

function AddUpdateForm({ noteId, onAdded }: { noteId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<{ url: string | null; type: string | null }>({ url: null, type: null });
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!body.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("release_note_updates").insert({
      release_note_id: noteId, body: body.trim(), media_url: media.url, media_type: media.type,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setBody(""); setMedia({ url: null, type: null }); setOpen(false);
    toast.success("Update added");
    onAdded();
  };

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="mt-3" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-4 w-4" />Add progress update
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-muted/30 p-3 border">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's the latest?" rows={2} />
      <MediaUploader url={media.url} type={media.type} onChange={setMedia} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => { setOpen(false); setBody(""); setMedia({ url: null, type: null }); }}>Cancel</Button>
        <Button size="sm" onClick={post} disabled={posting || !body.trim()}>
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}Post
        </Button>
      </div>
    </div>
  );
}
