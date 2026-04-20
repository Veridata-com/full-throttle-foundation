import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  imageId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ImagePreviewDrawer({ imageId, onClose, onChanged }: Props) {
  const [img, setImg] = useState<any>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!imageId) { setImg(null); setUrl(null); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("images").select("*").eq("id", imageId).single();
      setImg(data);
      if (data?.storage_path) {
        const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(data.storage_path, 3600);
        setUrl(signed?.signedUrl || null);
      }
      setLoading(false);
    })();
  }, [imageId]);

  const addTag = async () => {
    if (!img || !newTag.trim()) return;
    const tags = [...(img.ai_tags || []), newTag.trim()];
    await supabase.from("images").update({ ai_tags: tags }).eq("id", img.id);
    setImg({ ...img, ai_tags: tags });
    setNewTag("");
    onChanged();
  };

  const removeTag = async (t: string) => {
    if (!img) return;
    const tags = (img.ai_tags || []).filter((x: string) => x !== t);
    await supabase.from("images").update({ ai_tags: tags }).eq("id", img.id);
    setImg({ ...img, ai_tags: tags });
    onChanged();
  };

  const del = async () => {
    if (!img) return;
    if (!confirm("Delete this image?")) return;
    await supabase.storage.from("product-images").remove([img.storage_path]);
    await supabase.from("images").delete().eq("id", img.id);
    toast.success("Deleted");
    onClose();
    onChanged();
  };

  return (
    <Sheet open={!!imageId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader><SheetTitle className="truncate">{img?.file_name || "Image"}</SheetTitle></SheetHeader>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : img ? (
          <div className="space-y-4 mt-4">
            <div className="rounded-lg overflow-hidden bg-muted aspect-[3/4]">
              {url && <img src={url} alt={img.ai_description || img.file_name || "Image"} className="w-full h-full object-contain" />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{img.ai_description || <span className="text-muted-foreground italic">Pending AI...</span>}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Quality</p>
              <Badge variant={img.quality === "high" ? "default" : img.quality === "low" ? "destructive" : "secondary"}>
                {img.quality || "unknown"}
              </Badge>
              {img.is_product_shot && <Badge className="ml-2">Product shot</Badge>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {(img.ai_tags || []).map((t: string) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => removeTag(t)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag..." onKeyDown={(e) => e.key === "Enter" && addTag()} />
                <Button size="icon" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <Button variant="destructive" onClick={del} className="w-full">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
