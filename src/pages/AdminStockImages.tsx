import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["workspace", "lifestyle", "money", "tech", "minimal", "people"] as const;
type Category = (typeof CATEGORIES)[number] | "all";

const BUCKET = "stock-images";

interface StockImage {
  id: string;
  public_url: string;
  storage_path: string;
  category: string;
  filename: string;
  ai_description: string;
}

export default function AdminStockImages() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [images, setImages] = useState<StockImage[]>([]);
  const [filter, setFilter] = useState<Category>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<typeof CATEGORIES[number]>("workspace");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    setLoading(true);
    const q = supabase.from("stock_images").select("*").order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setImages((data as StockImage[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchImages(); }, [isAdmin]);

  if (adminLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filtered = filter === "all" ? images : images.filter((i) => i.category === filter);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split(".").pop();
        const path = `${uploadCategory}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const { error: dbErr } = await supabase.from("stock_images").insert({
          storage_path: path,
          public_url: urlData.publicUrl,
          category: uploadCategory,
          filename: file.name,
          ai_description: "",
          ai_tags: [],
        });
        if (dbErr) throw dbErr;
        added++;
      } catch (e: any) {
        toast.error(`Failed to upload ${file.name}: ${e.message}`);
      }
    }
    if (added > 0) {
      toast.success(`Uploaded ${added} image${added > 1 ? "s" : ""}`);
      fetchImages();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (img: StockImage) => {
    setDeleting((d) => new Set(d).add(img.id));
    try {
      const { error: storageErr } = await supabase.storage.from(BUCKET).remove([img.storage_path]);
      if (storageErr) throw storageErr;
      const { error: dbErr } = await supabase.from("stock_images").delete().eq("id", img.id);
      if (dbErr) throw dbErr;
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting((d) => { const n = new Set(d); n.delete(img.id); return n; });
    }
  };

  const handleCategoryChange = async (img: StockImage, category: string) => {
    const { error } = await supabase.from("stock_images").update({ category }).eq("id", img.id);
    if (error) { toast.error(error.message); return; }
    setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, category } : i));
    toast.success("Category updated");
  };

  return (
    <>
      <SEO title="Admin — Stock Images" />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Images</h1>
            <p className="text-sm text-muted-foreground mt-1">{images.length} images total — changes apply to all users</p>
          </div>

          {/* Upload */}
          <div className="flex items-center gap-3">
            <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as typeof CATEGORIES[number])}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Images
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", ...CATEGORIES] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c} {c === "all" ? `(${images.length})` : `(${images.filter((i) => i.category === c).length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">No images in this category</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((img) => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-muted aspect-[3/4]">
                <img
                  src={img.public_url}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <button
                    onClick={() => handleDelete(img)}
                    disabled={deleting.has(img.id)}
                    className="self-end p-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white"
                  >
                    {deleting.has(img.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  <Select value={img.category} onValueChange={(v) => handleCategoryChange(img, v)}>
                    <SelectTrigger className="h-7 text-xs bg-black/70 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
