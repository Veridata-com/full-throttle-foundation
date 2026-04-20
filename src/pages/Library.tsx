import { useEffect, useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Loader2, FileImage, Search, Folder, FolderOpen, Sparkles, Edit2, Check, X, Package, RotateCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { ImagePreviewDrawer } from "@/components/ImagePreviewDrawer";
import { Link } from "react-router-dom";

interface ImageRow {
  id: string;
  storage_path: string;
  file_name: string | null;
  ai_status: string;
  ai_description: string | null;
  ai_tags: string[] | null;
  ai_error: string | null;
  quality: string | null;
  is_product_shot: boolean;
  created_at: string;
}

interface FolderRow { id: string; name: string; auto: boolean; system: boolean; }

const Library = () => {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [images, setImages] = useState<ImageRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [imageFolders, setImageFolders] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [uploadMode, setUploadMode] = useState<"regular" | "product">(
    params.get("upload") === "product" ? "product" : "regular"
  );

  useEffect(() => {
    if (params.get("upload") === "product") {
      setUploadMode("product");
      params.delete("upload");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!user || !current) { setLoading(false); return; }
    setLoading(true);
    const [imgRes, folderRes, ifRes] = await Promise.all([
      supabase.from("images").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }),
      supabase.from("folders").select("*").eq("workspace_id", current.id).order("name"),
      supabase.from("image_folders").select("image_id, folder_id").eq("user_id", user.id),
    ]);
    setImages((imgRes.data as any) || []);
    setFolders((folderRes.data as any) || []);
    const map: Record<string, string[]> = {};
    ((ifRes.data as any) || []).forEach((r: any) => {
      map[r.image_id] = map[r.image_id] || [];
      map[r.image_id].push(r.folder_id);
    });
    setImageFolders(map);
    setLoading(false);
  }, [user, current]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("images-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "images", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "folders", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!user || !current) return;
    setUploading(true);
    const isProduct = uploadMode === "product";
    try {
      let productFolderId: string | null = null;
      if (isProduct) {
        const { data: sys } = await supabase.from("folders").select("id")
          .eq("workspace_id", current.id).eq("system", true).maybeSingle();
        productFolderId = sys?.id || null;
        if (!productFolderId) {
          const { data: newF } = await supabase.from("folders").insert({
            workspace_id: current.id, user_id: user.id, name: "Product slide images", system: true,
          }).select("id").single();
          productFolderId = newF?.id || null;
        }
      }

      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${current.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
        if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
        const { data: row } = await supabase.from("images").insert({
          user_id: user.id, workspace_id: current.id, storage_path: path, file_name: file.name,
          mime_type: file.type, size_bytes: file.size, is_product_shot: isProduct,
        }).select().single();
        if (!row) continue;
        if (isProduct && productFolderId) {
          await supabase.from("image_folders").insert({ image_id: row.id, folder_id: productFolderId, user_id: user.id });
        }
        const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 3600);
        if (signed?.signedUrl) {
          supabase.functions.invoke("label-image", { body: { imageId: row.id, signedUrl: signed.signedUrl, workspaceId: current.id } })
            .then(({ error }) => {
              if (error) {
                console.error("label-image invoke failed", error);
                supabase.from("images").update({ ai_status: "failed", ai_error: error.message || "invoke failed" }).eq("id", row.id).then(() => {});
              }
            });
        }
      }
      toast.success(`Uploaded ${files.length} ${isProduct ? "product " : ""}file${files.length > 1 ? "s" : ""}`);
      await load();
    } finally { setUploading(false); }
  }, [user, current, load, uploadMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] }, maxSize: 10 * 1024 * 1024,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return images.filter((img) => {
      if (activeFolder && !(imageFolders[img.id] || []).includes(activeFolder)) return false;
      if (!q) return true;
      return (
        img.file_name?.toLowerCase().includes(q) ||
        img.ai_description?.toLowerCase().includes(q) ||
        (img.ai_tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [images, search, activeFolder, imageFolders]);

  const renameFolder = async (id: string) => {
    if (!editName.trim()) { setEditingFolder(null); return; }
    const { error } = await supabase.from("folders").update({ name: editName.trim() }).eq("id", id);
    if (error) toast.error(error.message);
    setEditingFolder(null);
    load();
  };

  const deleteFolder = async (f: FolderRow) => {
    if (f.system) { toast.error("System folder can't be deleted"); return; }
    if (!confirm(`Delete folder "${f.name}"? Images stay in your library.`)) return;
    const { error } = await supabase.from("folders").delete().eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    if (activeFolder === f.id) setActiveFolder(null);
    load();
  };

  const retryTagging = async (img: ImageRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!current) return;
    await supabase.from("images").update({ ai_status: "pending", ai_error: null }).eq("id", img.id);
    const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(img.storage_path, 3600);
    if (!signed?.signedUrl) { toast.error("Could not get image URL"); return; }
    toast.info("Retrying AI tagging...");
    const { error } = await supabase.functions.invoke("label-image", {
      body: { imageId: img.id, signedUrl: signed.signedUrl, workspaceId: current.id },
    });
    if (error) toast.error(error.message);
    else toast.success("Tagging started");
    load();
  };

  if (!current) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Create a workspace to start uploading images.</p>
        <Button asChild><Link to="/workspaces/new">New workspace</Link></Button>
      </div>
    );
  }

  return (
    <>
      <SEO title="Image library" description="Organize workspace images." />
      <div className="container py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold">Library</h1>
          <p className="text-muted-foreground">Upload, tag, and organize images for {current.name}.</p>
        </header>

        <div className="flex gap-2 mb-3">
          <Button size="sm" variant={uploadMode === "regular" ? "default" : "outline"} onClick={() => setUploadMode("regular")}>
            <UploadCloud className="h-3.5 w-3.5" /> Regular images
          </Button>
          <Button size="sm" variant={uploadMode === "product" ? "default" : "outline"} onClick={() => setUploadMode("product")}>
            <Package className="h-3.5 w-3.5" /> Product slide images
          </Button>
        </div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-6 ${isDragActive ? "border-primary bg-primary/5" : uploadMode === "product" ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40"}`}>
          <input {...getInputProps()} />
          {uploadMode === "product" ? <Package className="h-8 w-8 mx-auto mb-2 text-primary" /> : <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />}
          <p className="text-sm font-medium">
            {isDragActive ? "Drop them here" : uploadMode === "product" ? "Upload product slide images (used as final CTA slide)" : "Drag or click to upload regular images"}
          </p>
          {uploading && <div className="mt-2 inline-flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</div>}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, tag, description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-4">
          <Card className="p-3 shadow-card h-fit">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-2">Folders</p>
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted ${!activeFolder ? "bg-muted font-medium" : ""}`}
            >
              <FolderOpen className="h-4 w-4" /> All files ({images.length})
            </button>
            {folders.map((f) => {
              const count = images.filter((i) => (imageFolders[i.id] || []).includes(f.id)).length;
              const isActive = activeFolder === f.id;
              return (
                <div key={f.id} className="group flex items-center gap-1">
                  {editingFolder === f.id ? (
                    <div className="flex gap-1 flex-1 px-1 py-1">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" autoFocus onKeyDown={(e) => e.key === "Enter" && renameFolder(f.id)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renameFolder(f.id)}><Check className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingFolder(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveFolder(f.id)}
                        className={`flex-1 text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted ${isActive ? "bg-muted font-medium" : ""}`}
                      >
                        <Folder className="h-4 w-4" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                      </button>
                      {!f.system && (
                        <div className="opacity-0 group-hover:opacity-100 flex">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingFolder(f.id); setEditName(f.name); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteFolder(f)}><X className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </Card>

          <Card className="shadow-card overflow-hidden">
            {loading ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {search ? "No matches." : "No images yet. Upload above."}
              </div>
            ) : (
              <div className="divide-y">
                <div className="grid grid-cols-[auto_1fr_120px_100px_120px] gap-3 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                  <span></span><span>Name</span><span>Quality</span><span>Tags</span><span>Date</span>
                </div>
                {filtered.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setPreviewId(img.id)}
                    className="w-full grid grid-cols-[auto_1fr_140px_100px_120px] gap-3 px-4 py-2.5 hover:bg-muted/50 text-left items-center text-sm cursor-pointer"
                  >
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{img.file_name || "Untitled"}</p>
                      {img.ai_status === "processing" || img.ai_status === "pending" ? (
                        <p className="text-xs text-primary flex items-center gap-1"><Sparkles className="h-3 w-3 animate-pulse" /> Tagging...</p>
                      ) : img.ai_status === "failed" ? (
                        <p className="text-xs text-destructive flex items-center gap-1 truncate"><AlertCircle className="h-3 w-3" /> {img.ai_error || "Tagging failed"}</p>
                      ) : img.ai_description && (
                        <p className="text-xs text-muted-foreground truncate">{img.ai_description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {img.quality && (
                        <Badge variant={img.quality === "high" ? "default" : img.quality === "low" ? "destructive" : "secondary"} className="text-[10px]">
                          {img.quality}
                        </Badge>
                      )}
                      {img.is_product_shot && <Badge className="text-[10px]">product</Badge>}
                      {img.ai_status === "failed" && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => retryTagging(img, e)} title="Retry tagging">
                          <RotateCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap min-w-0">
                      {(img.ai_tags || []).slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(img.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ImagePreviewDrawer imageId={previewId} onClose={() => setPreviewId(null)} onChanged={load} />
    </>
  );
};

export default Library;
