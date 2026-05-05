import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { BarChart2, Loader2, RefreshCw, Sparkles, ArrowRight, AlertCircle, Link2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LinkSlideshowDialog } from "@/components/LinkSlideshowDialog";
import { TiktokAccountsManager } from "@/components/TiktokAccountsManager";

const fmt = (n: number) => {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
};

const Analytics = () => {
  const { user } = useAuth();
  const [posted, setPosted] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [linkTarget, setLinkTarget] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: ps }, { data: pm }, { data: ins }] = await Promise.all([
      supabase.from("posted_slideshows").select("*").eq("user_id", user.id).order("posted_at", { ascending: false }),
      supabase.from("post_metrics").select("*").eq("user_id", user.id),
      supabase.from("user_insights").select("*").eq("user_id", user.id).eq("is_current", true).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPosted(ps || []);
    const map: Record<string, any> = {};
    (pm || []).forEach((m: any) => { map[m.posted_slideshow_id] = m; });
    setMetrics(map);
    setInsight(ins);
    setLoading(false);

    if (ins) {
      await supabase.from("profiles").update({ insights_last_seen_at: new Date().toISOString() }).eq("id", user.id);
    }
  };

  useEffect(() => { load(); }, [user]);

  const generateInsights = async () => {
    setGeneratingInsight(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", { body: {} });
      if (error) throw error;
      const err = (data as any)?.error;
      if (err === "not_enough_posts") toast.error("Need 10+ tracked posts");
      else if (err) toast.error(err);
      else toast.success("Insights refreshed");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setGeneratingInsight(false);
    }
  };

  const synced = useMemo(() => posted.filter(p => p.sync_status === "synced"), [posted]);
  const overview = useMemo(() => {
    const withMetrics = synced.map(p => ({ p, m: metrics[p.id] })).filter(x => x.m);
    const totalViews = withMetrics.reduce((s, x) => s + (x.m.views || 0), 0);
    const totalEng = withMetrics.reduce((s, x) => s + Number(x.m.engagement_rate || 0), 0);
    const best = [...withMetrics].sort((a, b) => Number(b.m.performance_score || 0) - Number(a.m.performance_score || 0))[0];
    return {
      count: synced.length,
      avgViews: withMetrics.length ? Math.round(totalViews / withMetrics.length) : 0,
      avgEng: withMetrics.length ? (totalEng / withMetrics.length) : 0,
      bestHook: best?.p?.hook_text || "—",
    };
  }, [synced, metrics]);

  const sortedPosts = useMemo(() => {
    return [...posted].sort((a, b) => {
      const sa = Number(metrics[a.id]?.performance_score || 0);
      const sb = Number(metrics[b.id]?.performance_score || 0);
      return sb - sa;
    });
  }, [posted, metrics]);

  const trackedCount = posted.length;
  const insightThreshold = 10;
  const progress = Math.min(100, (trackedCount / insightThreshold) * 100);

  return (
    <>
      <SEO title="Analytics" description="Track your TikTok performance and let AI improve your slideshows." />
      <div className="container py-8 space-y-6">
        <header>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><BarChart2 className="h-7 w-7" /> Analytics</h1>
          <p className="text-muted-foreground">Track your TikTok performance and let AI improve your slideshows.</p>
        </header>

        <TiktokAccountsManager onChange={load} />

        {/* Overview */}
        {synced.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Posts tracked" value={String(overview.count)} />
            <MetricCard label="Avg views" value={fmt(overview.avgViews)} />
            <MetricCard label="Avg engagement" value={overview.avgEng.toFixed(1) + "%"} />
            <MetricCard label="Best hook" value={overview.bestHook.slice(0, 40) + (overview.bestHook.length > 40 ? "…" : "")} small />
          </div>
        )}

        {/* AI Insights */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI insights</h2>
              {insight && <p className="text-xs text-muted-foreground">Generated {new Date(insight.generated_at).toLocaleDateString()} · {insight.posts_analyzed} posts analyzed</p>}
            </div>
            {trackedCount >= insightThreshold && (
              <Button size="sm" variant="outline" onClick={generateInsights} disabled={generatingInsight}>
                {generatingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh analysis
              </Button>
            )}
          </div>

          {trackedCount < insightThreshold ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">AI insights unlock after {insightThreshold} tracked posts. You have {trackedCount} so far. Keep posting!</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{trackedCount}/{insightThreshold}</p>
            </div>
          ) : !insight ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Ready to generate your first insights.</p>
              <Button onClick={generateInsights} disabled={generatingInsight}>
                {generatingInsight && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate insights
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-1">What's working for you</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{insight.insight_summary}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <InsightRow label="Best hooks" items={insight.top_hook_patterns} />
                <InsightRow label="Avoid" items={insight.worst_hook_patterns} variant="destructive" />
                <InsightRow label="Best topics" items={insight.best_posting_topics} />
                <InsightRow label="Best style" items={insight.best_style ? [insight.best_style] : []} />
                {insight.best_slide_count != null && <InsightRow label="Optimal slides" items={[String(insight.best_slide_count)]} />}
                <InsightRow label="Best image types" items={insight.best_image_types} />
              </div>
              {insight.next_hook_suggestion && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-bold text-primary mb-1">NEXT HOOK SUGGESTION</p>
                  <p className="text-sm">{insight.next_hook_suggestion}</p>
                </div>
              )}
              <Button asChild className="w-full">
                <Link to={`/slideshows/new?style=${encodeURIComponent(insight.best_style || "")}&slides=${insight.best_slide_count || ""}`}>
                  Generate optimized slideshow <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Posts table */}
        <Card className="p-6">
          <h2 className="font-display text-xl font-bold mb-4">Tracked posts</h2>
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : posted.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">No posts tracked yet.</p>
              <p className="text-xs text-muted-foreground mb-4">Click "Sync now" above to import your recent TikTok posts, or mark a slideshow as posted.</p>
              <Button asChild variant="outline"><Link to="/slideshows">Go to my slideshows <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              {posted.some((p) => p.auto_imported && !p.slideshow_id) && (
                <div className="mx-2 mb-3 p-3 rounded-md border border-primary/30 bg-primary/5 flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Some imported posts aren't linked to a slideshow yet.</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Link each one to its source slideshow so the AI can learn what hooks, styles, and topics actually perform for you.</p>
                  </div>
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground text-left">
                    <th className="px-2 py-2 font-medium">Hook</th>
                    <th className="px-2 py-2 font-medium">Slides</th>
                    <th className="px-2 py-2 font-medium">Style</th>
                    <th className="px-2 py-2 font-medium">Views</th>
                    <th className="px-2 py-2 font-medium">Likes</th>
                    <th className="px-2 py-2 font-medium">Eng.</th>
                    <th className="px-2 py-2 font-medium">Score</th>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPosts.map(p => {
                    const m = metrics[p.id];
                    const needsLink = p.auto_imported && !p.slideshow_id;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-2 py-2 max-w-[280px] truncate" title={p.hook_text}>{p.hook_text.slice(0, 50)}{p.hook_text.length > 50 ? "…" : ""}</td>
                        <td className="px-2 py-2">{p.slide_count}</td>
                        <td className="px-2 py-2"><Badge variant="secondary" className="text-xs">{p.style}</Badge></td>
                        <td className="px-2 py-2">{m ? fmt(m.views) : "—"}</td>
                        <td className="px-2 py-2">{m ? fmt(m.likes) : "—"}</td>
                        <td className="px-2 py-2">{m ? Number(m.engagement_rate).toFixed(1) + "%" : "—"}</td>
                        <td className="px-2 py-2 font-bold">{m ? Math.round(Number(m.performance_score)) : "—"}</td>
                        <td className="px-2 py-2">
                          {needsLink ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLinkTarget(p)}>
                              <Link2 className="h-3 w-3" /> Link
                            </Button>
                          ) : p.slideshow_id ? (
                            <Badge variant="secondary" className="text-xs">linked</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">manual</Badge>
                          )}
                        </td>
                        <td className="px-2 py-2"><StatusPill status={p.sync_status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <LinkSlideshowDialog
        open={!!linkTarget}
        onOpenChange={(o) => !o && setLinkTarget(null)}
        postedSlideshow={linkTarget}
        onLinked={load}
      />
    </>
  );
};

function MetricCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-display font-bold mt-1 ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
    </Card>
  );
}

function InsightRow({ label, items, variant }: { label: string; items?: string[] | null; variant?: "destructive" }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <Badge key={i} variant={variant === "destructive" ? "destructive" : "secondary"} className="text-xs font-normal">{it}</Badge>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    synced: "bg-success/20 text-success",
    failed: "bg-destructive/20 text-destructive",
    insufficient_data: "bg-muted text-muted-foreground",
  };
  return <Badge className={`text-xs ${map[status] || ""}`}>{status === "insufficient_data" ? "no data" : status}</Badge>;
}

export default Analytics;
