// Label a product image with Lovable AI (Gemini 3 Flash). Writes description, tags, quality, and auto-folder links.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body { imageId: string; signedUrl: string; workspaceId: string; }

// Strip em/en dashes from any AI text
function clean(s: any): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[—–]/g, ', ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
}

const SYSTEM = `You are a product marketing analyst. Analyze the image and return structured data. Write like a real human, conversational and relatable. Never use em-dashes or en-dashes. Use short sentences and commas.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return j({ error: 'LOVABLE_API_KEY missing' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as Body;
    if (!body.imageId || !body.signedUrl) return j({ error: 'invalid body' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: img } = await admin.from('images').select('user_id, workspace_id').eq('id', body.imageId).single();
    if (!img || img.user_id !== user.id) return j({ error: 'forbidden' }, 403);

    // Hard cost cap: ~0.05 cents per label call
    const { data: capOk, error: capErr } = await admin.rpc('check_and_increment_ai_cost', { _user_id: user.id, _cost_cents: 1 });
    if (capErr) console.error('cost cap rpc error', capErr);
    if (capOk === false) {
      await admin.from('images').update({ ai_status: 'failed', ai_error: 'cost cap reached' }).eq('id', body.imageId);
      return j({ error: 'cost_cap_reached' }, 402);
    }

    await admin.from('images').update({ ai_status: 'processing', ai_error: null }).eq('id', body.imageId);

    // Download the image and convert to base64 data URL — Gemini via Lovable AI is more reliable with inline data than remote URLs
    let dataUrl = body.signedUrl;
    try {
      const imgRes = await fetch(body.signedUrl);
      if (imgRes.ok) {
        const ct = imgRes.headers.get('content-type') || 'image/jpeg';
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        // base64 encode
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) {
          binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)) as any);
        }
        const b64 = btoa(binary);
        dataUrl = `data:${ct};base64,${b64}`;
      } else {
        console.error('failed to download image', imgRes.status);
      }
    } catch (e) {
      console.error('image download error', e);
    }

    const tool = {
      type: 'function',
      function: {
        name: 'label_image',
        description: 'Produce product labels',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string', description: '1-2 short sentences describing the image objectively' },
            tags: { type: 'array', items: { type: 'string' }, description: '5-10 short keywords' },
            palette: { type: 'array', items: { type: 'string' }, description: '3-5 dominant hex colors' },
            quality: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Photo quality' },
            suggested_folders: { type: 'array', items: { type: 'string' }, description: '1-4 broad category folder names like Lifestyle, Product shots, Packaging, Close-ups' },
          },
          required: ['description', 'tags', 'quality', 'suggested_folders'],
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: [
            { type: 'text', text: 'Analyze this product image and call label_image with the results.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ]},
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'label_image' } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error('label-image AI error', aiRes.status, txt);
      await admin.from('images').update({ ai_status: 'failed', ai_error: `${aiRes.status}: ${txt.slice(0,200)}` }).eq('id', body.imageId);
      if (aiRes.status === 429) return j({ error: 'rate_limit' }, 429);
      if (aiRes.status === 402) return j({ error: 'payment_required' }, 402);
      return j({ error: 'ai_failed', detail: txt }, 500);
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try { parsed = JSON.parse(call?.function?.arguments || '{}'); } catch { parsed = {}; }

    const description = clean(parsed.description);
    const tags = Array.isArray(parsed.tags) ? parsed.tags.map(clean).filter(Boolean).slice(0, 15) : [];
    const palette = Array.isArray(parsed.palette) ? parsed.palette : [];
    const quality = ['low','medium','high'].includes(parsed.quality) ? parsed.quality : 'medium';
    const suggestedFolders: string[] = Array.isArray(parsed.suggested_folders) ? parsed.suggested_folders.map(clean).filter(Boolean).slice(0, 4) : [];

    await admin.from('images').update({
      ai_description: description,
      ai_tags: tags,
      ai_palette: { colors: palette },
      quality,
      ai_status: 'done',
      ai_error: null,
    }).eq('id', body.imageId);

    // Auto-folder linking (only if image belongs to a workspace)
    if (img.workspace_id && suggestedFolders.length) {
      for (const fname of suggestedFolders) {
        const { data: existing } = await admin
          .from('folders')
          .select('id')
          .eq('workspace_id', img.workspace_id)
          .eq('name', fname)
          .maybeSingle();
        let fid = existing?.id;
        if (!fid) {
          const { data: newF } = await admin
            .from('folders')
            .insert({ workspace_id: img.workspace_id, user_id: user.id, name: fname, auto: true })
            .select('id')
            .single();
          fid = newF?.id;
        }
        if (fid) {
          await admin.from('image_folders').insert({ image_id: body.imageId, folder_id: fid, user_id: user.id }).select();
        }
      }
    }

    return j({ ok: true, description, tags, quality, suggested_folders: suggestedFolders });
  } catch (e: any) {
    console.error('label-image error', e);
    return j({ error: e.message || 'unknown' }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
