import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const NewWorkspace = () => {
  const { user } = useAuth();
  const { refresh, setCurrentId } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [audience, setAudience] = useState("");
  const [voice, setVoice] = useState("");
  const [cta, setCta] = useState("Try it now");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] }, maxSize: 10 * 1024 * 1024,
  });

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Name your product"); return; }
    if (files.length === 0) { toast.error("Upload at least one product image"); return; }
    setLoading(true);
    try {
      const { data: wsId, error: rpcErr } = await supabase.rpc("create_workspace_with_folder", {
        _name: name.trim(), _tagline: tagline || null, _audience: audience || null, _brand_voice: voice || null, _cta: cta || null,
      });
      if (rpcErr) throw rpcErr;
      const workspaceId = wsId as unknown as string;

      // Get the "Product slide images" folder id
      const { data: folder } = await supabase.from("folders")
        .select("id").eq("workspace_id", workspaceId).eq("name", "Product slide images").single();

      // Upload each file
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${workspaceId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
        if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
        const { data: row } = await supabase.from("images").insert({
          user_id: user.id, workspace_id: workspaceId, storage_path: path, file_name: file.name,
          mime_type: file.type, size_bytes: file.size, is_product_shot: true,
        }).select().single();
        if (row && folder?.id) {
          await supabase.from("image_folders").insert({ image_id: row.id, folder_id: folder.id, user_id: user.id });
          const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 3600);
          if (signed?.signedUrl) {
            supabase.functions.invoke("label-image", { body: { imageId: row.id, signedUrl: signed.signedUrl, workspaceId } }).catch(() => {});
          }
        }
      }

      await refresh();
      setCurrentId(workspaceId);
      toast.success("Workspace created");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally { setLoading(false); }
  };

  return (
    <>
      <SEO title="New workspace" description="Create a new product workspace." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">New workspace</h1>
        <p className="text-muted-foreground mb-6">A workspace is one SaaS or product you promote. The AI uses this context every time it writes copy.</p>

        <Card className="p-6 space-y-4 shadow-card">
          <div className="space-y-2">
            <Label>Product / SaaS name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AdRise" />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Make your SaaS profitable with converting organic TikTok slideshows." />
          </div>
          <div className="space-y-2">
            <Label>Target audience</Label>
            <Textarea rows={2} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Indie SaaS founders, 20-35, short on marketing time" />
          </div>
          <div className="space-y-2">
            <Label>Brand voice <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea rows={2} value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="e.g. Direct, witty, no corporate fluff" />
          </div>
          <div className="space-y-2">
            <Label>Default CTA <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Product slide images * <span className="text-muted-foreground text-xs">(used as final slide in every slideshow)</span></Label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <input {...getInputProps()} />
              <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{isDragActive ? "Drop here" : "Drag or click to upload at least one"}</p>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-xs">
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))} type="button"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1 shadow-glow" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create workspace
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} disabled={loading}>Skip</Button>
          </div>
        </Card>
      </div>
    </>
  );
};

export default NewWorkspace;
