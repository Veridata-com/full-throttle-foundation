import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Loader2, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

interface ImageRow {
  id: string;
  storage_path: string;
  file_name: string | null;
  ai_status: string;
  ai_description: string | null;
  ai_tags: string[] | null;
  created_at: string;
  signedUrl?: string;
}

const Library = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadImages = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("images").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const withUrls = await Promise.all((data || []).map(async (img: any) => {
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(img.storage_path, 3600);
      return { ...img, signedUrl: signed?.signedUrl };
    }));
    setImages(withUrls);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadImages(); }, [loadImages]);

  // Realtime updates so AI labels appear automatically
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("images-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "images", filter: `user_id=eq.${user.id}` }, () => loadImages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadImages]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!user) return;
    setUploading(true);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
        if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
        const { data: row, error: insErr } = await supabase.from("images").insert({
          user_id: user.id, storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size,
        }).select().single();
        if (insErr || !row) { toast.error(insErr?.message || "Insert failed"); continue; }

        // Trigger AI labeling (non-blocking)
        const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 3600);
        if (signed?.signedUrl) {
          supabase.functions.invoke("label-image", { body: { imageId: row.id, signedUrl: signed.signedUrl } })
            .catch(() => {});
        }
      }
      toast.success(`Uploaded ${files.length} image${files.length > 1 ? "s" : ""}`);
      await loadImages();
    } finally { setUploading(false); }
  }, [user, loadImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] }, maxSize: 10 * 1024 * 1024,
  });

  const deleteImage = async (img: ImageRow) => {
    if (!confirm("Delete this image?")) return;
    await supabase.storage.from("product-images").remove([img.storage_path]);
    await supabase.from("images").delete().eq("id", img.id);
    setImages(prev => prev.filter(i => i.id !== img.id));
    toast.success("Deleted");
  };

  const retryLabel = async (img: ImageRow) => {
    if (!img.signedUrl) return;
    await supabase.from("images").update({ ai_status: "pending" }).eq("id", img.id);
    toast.info("Re-running AI labeling…");
    supabase.functions.invoke("label-image", { body: { imageId: img.id, signedUrl: img.signedUrl } });
  };

  return (
    <>
      <SEO title="Image library" description="Upload and manage your product photos." />
      <div className="container py-8">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Image library</h1>
            <p className="text-muted-foreground">Drop product photos. AI tags them so you can find them fast.</p>
          </div>
        </header>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-8 ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
          <input {...getInputProps()} />
          <UploadCloud className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">{isDragActive ? "Drop them here…" : "Drag & drop or click to upload"}</p>
          <p className="text-xs text-muted-foreground mt-1">PNG · JPG · WEBP · up to 10MB each</p>
          {uploading && <div className="mt-3 inline-flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</div>}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No images yet. Upload your first product photo above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <Card key={img.id} className="overflow-hidden group shadow-card">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {img.signedUrl && <img src={img.signedUrl} alt={img.ai_description || img.file_name || "Product"} className="object-cover w-full h-full" loading="lazy" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 gap-1">
                    {img.ai_status === "failed" && (
                      <Button size="sm" variant="secondary" onClick={() => retryLabel(img)}><RefreshCw className="h-3 w-3" /></Button>
                    )}
                    <Button size="sm" variant="destructive" className="ml-auto" onClick={() => deleteImage(img)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {img.ai_status === "processing" || img.ai_status === "pending" ? (
                    <div className="absolute top-2 left-2 bg-background/90 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                      <Sparkles className="h-3 w-3 animate-pulse text-primary" /> Tagging…
                    </div>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-xs line-clamp-2 text-muted-foreground min-h-[2rem]">{img.ai_description || img.file_name}</p>
                  {img.ai_tags && img.ai_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {img.ai_tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Library;
