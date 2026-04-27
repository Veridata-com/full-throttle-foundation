import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, Image as ImageIcon, Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const MODE_OPTIONS = [
  { id: "photo", label: "Photo slides", desc: "Use uploaded or stock photos.", Icon: ImageIcon },
  { id: "designed", label: "AI-designed slides", desc: "Custom AI visuals with smart text placement.", Icon: Sparkles },
  { id: "mixed", label: "Mixed", desc: "Let the AI pick photo OR designed per slideshow.", Icon: Layers },
];

const WorkspaceSettings = () => {
  const { current, refresh, workspaces, setCurrentId } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [audience, setAudience] = useState("");
  const [voice, setVoice] = useState("");
  const [cta, setCta] = useState("");
  const [allowedModes, setAllowedModes] = useState<string[]>(["photo", "designed"]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (current) {
      setName(current.name);
      setTagline(current.tagline || "");
      setAudience(current.target_audience || "");
      setVoice(current.brand_voice || "");
      setCta(current.default_cta || "");
      setAllowedModes((current as any).allowed_generation_modes?.length ? (current as any).allowed_generation_modes : ["photo", "designed"]);
    }
  }, [current]);

  if (!current) return <div className="container py-8">No workspace selected.</div>;

  const toggleMode = (id: string) => {
    setAllowedModes((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // at least one required
        return prev.filter((m) => m !== id);
      }
      return [...prev, id];
    });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("workspaces").update({
      name, tagline: tagline || null, target_audience: audience || null,
      brand_voice: voice || null, default_cta: cta || null,
      allowed_generation_modes: allowedModes,
    } as any).eq("id", current.id);
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

        <Card className="p-6 mt-6 space-y-4 shadow-card">
          <div>
            <h2 className="font-display text-xl font-bold">Generation modes the AI can use</h2>
            <p className="text-sm text-muted-foreground">Pick which slideshow styles the AI is allowed to create for this workspace. A slideshow always uses one mode end-to-end — never mixed within a single slideshow.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {MODE_OPTIONS.map((m) => {
              const active = allowedModes.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMode(m.id)}
                  className={`text-left rounded-xl border-2 p-4 transition ${active ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-muted-foreground"}`}
                >
                  <m.Icon className="h-5 w-5 mb-2" />
                  <div className="font-semibold text-sm">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                </button>
              );
            })}
          </div>
          <Button onClick={save} disabled={saving} variant="secondary">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save modes</Button>
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
