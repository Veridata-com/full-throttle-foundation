// Lets the user link an auto-imported posted_slideshow to one of their generated
// slideshows so AdRise's AI can learn from full metadata (hook, style, topic, slides).
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Search, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postedSlideshow: any;
  onLinked?: () => void;
}

export function LinkSlideshowDialog({ open, onOpenChange, postedSlideshow, onLinked }: Props) {
  const { user } = useAuth();
  const [slideshows, setSlideshows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setSelectedId(null);
    setQuery("");
    setLoading(true);
    (async () => {
      // Exclude slideshows already linked to a posted_slideshow
      const [{ data: ss }, { data: linked }] = await Promise.all([
        supabase.from("slideshows").select("id,title,num_slides,hook_style,topic,created_at,status,slides")
          .eq("user_id", user.id).eq("status", "ready").order("created_at", { ascending: false }).limit(200),
        supabase.from("posted_slideshows").select("slideshow_id").eq("user_id", user.id).not("slideshow_id", "is", null),
      ]);
      const linkedIds = new Set((linked || []).map((r: any) => r.slideshow_id));
      setSlideshows((ss || []).filter((s: any) => !linkedIds.has(s.id)));
      setLoading(false);
    })();
  }, [open, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return slideshows;
    return slideshows.filter((s: any) =>
      (s.title || "").toLowerCase().includes(q) ||
      (s.topic || "").toLowerCase().includes(q)
    );
  }, [slideshows, query]);

  const link = async () => {
    if (!selectedId || !postedSlideshow || !user) return;
    setSaving(true);
    try {
      const ss = slideshows.find((s) => s.id === selectedId);
      const slides = Array.isArray(ss?.slides) ? ss.slides : [];
      const hookSlide = slides[0] || {};
      const allTexts = slides
        .map((s: any) => s?.text || s?.headline || s?.variables?.heading || s?.variables?.main_text || "")
        .filter(Boolean);
      const imgIds = slides.map((s: any) => s?.image_id).filter(Boolean).map(String);

      const { error } = await supabase.from("posted_slideshows").update({
        slideshow_id: ss.id,
        hook_text: hookSlide.text || hookSlide.headline || hookSlide?.variables?.heading || ss.title || postedSlideshow.hook_text,
        slide_count: slides.length || ss.num_slides || postedSlideshow.slide_count,
        style: ss.hook_style || postedSlideshow.style || "storytelling",
        topic: ss.topic || ss.title || postedSlideshow.topic || "",
        all_slide_texts: allTexts,
        image_ids: imgIds,
      }).eq("id", postedSlideshow.id);
      if (error) throw error;
      toast.success("Linked — AI can now learn from this post");
      onLinked?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to a generated slideshow</DialogTitle>
          <DialogDescription>
            Pick which slideshow from your library this TikTok post is. This lets the AI tie performance back to the hook, style, and content so it can improve future generations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {postedSlideshow && (
            <div className="rounded-md border border-border p-3 bg-muted/30">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">TikTok post</Label>
              <p className="text-sm font-medium truncate mt-1">{postedSlideshow.hook_text || postedSlideshow.caption || "Imported post"}</p>
              {postedSlideshow.tiktok_post_url && (
                <a href={postedSlideshow.tiktok_post_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate block mt-0.5">
                  {postedSlideshow.tiktok_post_url}
                </a>
              )}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or topic" className="pl-8" />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {slideshows.length === 0 ? "No unlinked slideshows in your library." : "No matches."}
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/40 flex items-center gap-3 ${selectedId === s.id ? "bg-primary/10" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.num_slides} slides · {s.hook_style || "—"} · {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedId === s.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={link} disabled={saving || !selectedId}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Link slideshow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
