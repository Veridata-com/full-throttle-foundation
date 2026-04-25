// Generate AI insights from a user's tracked TikTok performance data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const j = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MIN_POSTS = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return j({ error: 'LOVABLE_API_KEY missing' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: posted } = await admin
      .from('posted_slideshows')
      .select('*, post_metrics(views, likes, comments, shares, engagement_rate, performance_score)')
      .eq('user_id', user.id)
      .eq('sync_status', 'synced');

    const enriched = (posted || []).map((p: any) => {
      const m = (p.post_metrics || [])[0] || {};
      return {
        hook_text: p.hook_text,
        slide_count: p.slide_count,
        style: p.style,
        topic: p.topic,
        all_slide_texts: p.all_slide_texts,
        views: m.views || 0,
        likes: m.likes || 0,
        engagement_rate: Number(m.engagement_rate || 0),
        performance_score: Number(m.performance_score || 0),
      };
    }).sort((a: any, b: any) => b.performance_score - a.performance_score);

    if (enriched.length < MIN_POSTS) {
      return j({ error: 'not_enough_posts', have: enriched.length, need: MIN_POSTS });
    }

    const top = enriched.slice(0, Math.min(5, Math.ceil(enriched.length / 3)));
    const bottom = enriched.slice(-Math.min(5, Math.ceil(enriched.length / 3)));
    const avgViews = enriched.reduce((s, p) => s + p.views, 0) / enriched.length;
    const avgEng = enriched.reduce((s, p) => s + p.engagement_rate, 0) / enriched.length;

    const prompt = `You are analyzing TikTok slideshow performance for a SaaS marketing tool called AdRise.

PERFORMANCE DATA — ${enriched.length} posts.

TOP PERFORMERS:
${top.map(p => `Hook: "${p.hook_text}" | Slides: ${p.slide_count} | Style: ${p.style} | Topic: ${p.topic} | Views: ${p.views} | Eng: ${p.engagement_rate.toFixed(1)}% | Score: ${p.performance_score.toFixed(0)}/100`).join('\n')}

WORST PERFORMERS:
${bottom.map(p => `Hook: "${p.hook_text}" | Slides: ${p.slide_count} | Style: ${p.style} | Topic: ${p.topic} | Score: ${p.performance_score.toFixed(0)}/100`).join('\n')}

ALL POSTS AVERAGE: views ${Math.round(avgViews)}, engagement ${avgEng.toFixed(1)}%

Return concise, specific patterns this user should repeat or avoid.`;

    const tool = {
      type: 'function',
      function: {
        name: 'emit_insights',
        description: 'Emit structured insights',
        parameters: {
          type: 'object',
          properties: {
            top_hook_patterns: { type: 'array', items: { type: 'string' }, description: '3-5 short hook style descriptions that work for this user' },
            worst_hook_patterns: { type: 'array', items: { type: 'string' }, description: '2-3 hook patterns to avoid' },
            best_slide_count: { type: 'number' },
            best_style: { type: 'string' },
            best_posting_topics: { type: 'array', items: { type: 'string' } },
            best_image_types: { type: 'array', items: { type: 'string' } },
            next_hook_suggestion: { type: 'string', description: 'A concrete hook line to try next' },
            insight_summary: { type: 'string', description: '2-3 sentence human-readable summary of what is working' },
          },
          required: ['top_hook_patterns', 'worst_hook_patterns', 'best_style', 'best_posting_topics', 'insight_summary'],
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: 'You are a TikTok performance analyst. Be specific, data-driven, no fluff.' },
          { role: 'user', content: prompt },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'emit_insights' } },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return j({ error: `ai_failed: ${aiRes.status} ${t.slice(0, 200)}` }, 500);
    }
    const aiData = await aiRes.json();
    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return j({ error: 'no_tool_call' }, 500);
    const parsed = JSON.parse(call.function.arguments || '{}');

    // Mark previous insights inactive
    await admin.from('user_insights').update({ is_current: false }).eq('user_id', user.id).eq('is_current', true);

    const { data: inserted, error: insErr } = await admin.from('user_insights').insert({
      user_id: user.id,
      posts_analyzed: enriched.length,
      top_hook_patterns: parsed.top_hook_patterns || [],
      worst_hook_patterns: parsed.worst_hook_patterns || [],
      best_slide_count: parsed.best_slide_count ?? null,
      best_style: parsed.best_style || null,
      best_posting_topics: parsed.best_posting_topics || [],
      best_image_types: parsed.best_image_types || [],
      next_hook_suggestion: parsed.next_hook_suggestion || null,
      insight_summary: parsed.insight_summary || '',
      raw_analysis: parsed,
      is_current: true,
    }).select().single();
    if (insErr) throw insErr;

    return j({ insight: inserted });
  } catch (e: any) {
    console.error('generate-insights error', e);
    return j({ error: e.message || 'failed' }, 500);
  }
});
