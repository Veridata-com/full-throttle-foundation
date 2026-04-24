import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquareHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(5, "Tell us a bit more").max(5000),
});

interface Props {
  trigger?: React.ReactNode;
  /** Render compact button if no trigger provided */
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function FeedbackDialog({ trigger, variant = "outline", size = "default", className, label = "Give feedback" }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Gate: must be logged in AND on a paid plan
      if (!user) {
        navigate("/auth?mode=signup&intent=feedback");
        return;
      }
      if (!profile || profile.plan === "none") {
        toast.info("Feedback is for paying users — choose a plan to continue");
        navigate("/billing?intent=feedback");
        return;
      }
    }
    setOpen(next);
  };

  const submit = async () => {
    const parsed = schema.safeParse({ subject, body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: user.email ?? null,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks! Feedback received.");
    setSubject(""); setBody(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={variant} size={size} className={className}>
            <MessageSquareHeart className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share honest, constructive feedback</DialogTitle>
          <DialogDescription>
            We're in early beta and shipping fast. Tell us what's broken, confusing, or missing — the more specific, the better.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fb-subject">Subject (optional)</Label>
            <Input id="fb-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Short summary" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-body">Your feedback</Label>
            <Textarea id="fb-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} placeholder="What would make AdRise better?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
