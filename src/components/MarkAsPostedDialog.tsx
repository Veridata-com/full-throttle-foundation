import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slideshow: any;
  onMarked?: () => void;
}

export function MarkAsPostedDialog({ open, onOpenChange, slideshow, onMarked }: Props) {
  const { user, profile } = useAuth();
  const [handle, setHandle] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHandle((profile as any)?.tiktok_handle || "");
      setPostUrl("");
      setTopic("");
    }
  }, [open, profile]);

  const save = async () => {
    if (!user || !slideshow) return;
    const cleanHandle = handle.trim().replace(/^@/, "");
    if (!cleanHandle) { toast.error("Enter your TikTok handle"); return; }
    setSaving(true);
    try {
      const slides = Array.isArray(slideshow.slides) ? slideshow.slides : [];
      const hookSlide = slides[0] || {};
      const allTexts = slides.map((s: any) => s?.text || s?.headline || "").filter(Boolean);
      const imgIds = (slideshow.image_ids || []).map((id: any) => String(id));

      // Save handle to profile if missing
      if (!(profile as any)?.tiktok_handle) {
        await supabase.from("profiles").update({ tiktok_handle: cleanHandle, apify_sync_enabled: true }).eq("id", user.id);
      }

      const { data: posted, error } = await supabase.from("posted_slideshows").insert({
        user_id: user.id,
        slideshow_id: slideshow.id,
        tiktok_handle: cleanHandle,
        tiktok_post_url: postUrl.trim() || null,
        hook_text: hookSlide.text || hookSlide.headline || slideshow.title || "(no hook)",
        slide_count: slides.length || slideshow.num_slides || 0,
        style: slideshow.hook_style || "storytelling",
        topic: topic.trim() || slideshow.title || "",
        all_slide_texts: allTexts,
        image_ids: imgIds,
        sync_status: "pending",
      }).select().single();
      if (error) throw error;

      toast.success("Marked as posted");
      // Fire-and-forget sync
      supabase.functions.invoke("sync-tiktok-metrics", { body: { posted_slideshow_id: posted.id } })
        .catch(() => {/* silently */});
      onMarked?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as posted");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Posted to TikTok</DialogTitle>
          <DialogDescription>Track this slideshow's performance so AdRise's AI can learn what works for you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Slideshow</Label>
            <p className="font-medium truncate">{slideshow?.title}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="handle">TikTok handle</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))} placeholder="yourtiktokhandle" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">TikTok post URL <span className="text-muted-foreground font-normal">(optional, more accurate)</span></Label>
            <Input id="url" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://www.tiktok.com/@you/photo/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. productivity, fitness, money" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark as posted
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
