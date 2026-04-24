import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { ArrowLeft, MessageSquare, Loader2, Rocket, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { FeedbackDialog } from "@/components/FeedbackDialog";

interface ReleaseNote {
  id: string;
  title: string;
  body: string | null;
  status: "shipped" | "upcoming";
  version: string | null;
  published_at: string;
  media_url: string | null;
  media_type: string | null;
}
interface Update { id: string; release_note_id: string; body: string; created_at: string; media_url: string | null; media_type: string | null; }
interface Comment { id: string; release_note_id: string; author_name: string | null; body: string; created_at: string; }

function Media({ url, type }: { url: string; type: string | null }) {
  if (type === "video") return <video src={url} controls className="rounded-lg max-h-80 w-auto border" />;
  return <img src={url} alt="" loading="lazy" className="rounded-lg max-h-80 w-auto border" />;
}

const commentSchema = z.object({
  author_name: z.string().trim().max(60).optional(),
  body: z.string().trim().min(2, "Comment too short").max(2000),
});

export default function ReleaseNotes() {
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
        </section>

        {loading ? (
          <div className="container max-w-3xl py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Section title="What's coming" icon={<Hourglass className="h-5 w-5" />} empty="Nothing planned publicly yet — give feedback to shape the roadmap.">
              {upcoming.map((n) => (
                <NoteCard key={n.id} note={n} updates={updates[n.id] || []} comments={comments[n.id] || []} onCommentPosted={load} />
              ))}
            </Section>
            <Section title="Shipped" icon={<Rocket className="h-5 w-5" />} empty="No releases yet. Check back soon.">
              {shipped.map((n) => (
                <NoteCard key={n.id} note={n} updates={updates[n.id] || []} comments={comments[n.id] || []} onCommentPosted={load} />
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

function NoteCard({ note, updates, comments, onCommentPosted }: { note: ReleaseNote; updates: Update[]; comments: Comment[]; onCommentPosted: () => void }) {
  const [showComments, setShowComments] = useState(false);
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
    onCommentPosted();
  };

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
      </div>
      {note.body && <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-2">{note.body}</p>}
      {note.media_url && <div className="mt-3"><Media url={note.media_url} type={note.media_type} /></div>}

      {updates.length > 0 && (
        <div className="mt-4 border-l-2 border-primary/40 pl-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress updates</p>
          {updates.map((u) => (
            <div key={u.id} className="text-sm space-y-2">
              <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
              <p className="whitespace-pre-wrap">{u.body}</p>
              {u.media_url && <Media url={u.media_url} type={u.media_type} />}
            </div>
          ))}
        </div>
      )}

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
