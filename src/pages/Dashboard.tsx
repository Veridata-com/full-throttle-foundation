import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Film, Plus, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ images: 0, slideshows: 0, monthSlideshows: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [imgs, ss, usage] = await Promise.all([
        supabase.from("images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("slideshows").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("usage").select("slideshows_generated").eq("user_id", user.id).order("period_start", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setStats({
        images: imgs.count || 0,
        slideshows: ss.count || 0,
        monthSlideshows: usage.data?.slideshows_generated || 0,
      });
    })();
  }, [user]);

  return (
    <>
      <SEO title="Dashboard" description="Your AdRise workspace." />
      <div className="container py-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""} 👋</h1>
          <p className="text-muted-foreground">Let's make something scroll-stopping.</p>
        </header>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Images" value={stats.images} icon={ImageIcon} />
          <StatCard label="Slideshows" value={stats.slideshows} icon={Film} />
          <StatCard label="This month" value={stats.monthSlideshows} icon={Film} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 shadow-card">
            <h2 className="font-display text-xl font-bold mb-2">Upload product photos</h2>
            <p className="text-sm text-muted-foreground mb-4">Drop in product images and let AI tag them automatically.</p>
            <Button asChild><Link to="/library"><Plus className="h-4 w-4" /> Add to library</Link></Button>
          </Card>
          <Card className="p-6 shadow-card border-primary/30 bg-gradient-to-br from-card to-primary/5">
            <h2 className="font-display text-xl font-bold mb-2">Create a slideshow</h2>
            <p className="text-sm text-muted-foreground mb-4">Pick images, pick a vibe, get a 6-slide ad in seconds.</p>
            <Button className="shadow-glow" asChild><Link to="/slideshows/new">New slideshow <ArrowRight className="h-4 w-4" /></Link></Button>
          </Card>
        </div>
      </div>
    </>
  );
};

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card className="p-5 flex items-center gap-4 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold font-display">{value}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default Dashboard;
