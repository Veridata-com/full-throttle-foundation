import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const WorkspaceSettings = () => {
  const { current, refresh, workspaces, setCurrentId } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [audience, setAudience] = useState("");
  const [voice, setVoice] = useState("");
  const [cta, setCta] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (current) {
      setName(current.name);
      setTagline(current.tagline || "");
      setAudience(current.target_audience || "");
      setVoice(current.brand_voice || "");
      setCta(current.default_cta || "");
    }
  }, [current]);

  if (!current) return <div className="container py-8">No workspace selected.</div>;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("workspaces").update({
      name, tagline: tagline || null, target_audience: audience || null,
      brand_voice: voice || null, default_cta: cta || null,
    }).eq("id", current.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    toast.success("Saved");
  };

  const del = async () => {
    if (!confirm(`Delete "${current.name}" and ALL its images and slideshows? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("workspaces").delete().eq("id", current.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    const remaining = workspaces.filter((w) => w.id !== current.id);
    if (remaining[0]) setCurrentId(remaining[0].id);
    await refresh();
    toast.success("Workspace deleted");
    navigate(remaining[0] ? "/dashboard" : "/workspaces/new");
  };

  return (
    <>
      <SEO title="Workspace settings" description="Edit your workspace." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-6">Workspace settings</h1>
        <Card className="p-6 space-y-4 shadow-card">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></div>
          <div className="space-y-2"><Label>Target audience</Label><Textarea rows={2} value={audience} onChange={(e) => setAudience(e.target.value)} /></div>
          <div className="space-y-2"><Label>Brand voice</Label><Textarea rows={2} value={voice} onChange={(e) => setVoice(e.target.value)} /></div>
          <div className="space-y-2"><Label>Default CTA</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} /></div>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
        </Card>

        <Card className="p-6 mt-6 border-destructive/40">
          <h2 className="font-semibold text-destructive mb-2">Danger zone</h2>
          <p className="text-sm text-muted-foreground mb-4">Deleting removes the workspace and all its images and slideshows.</p>
          <Button variant="destructive" onClick={del} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete workspace
          </Button>
        </Card>
      </div>
    </>
  );
};

export default WorkspaceSettings;
