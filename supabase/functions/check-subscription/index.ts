// Sync subscription status from Stripe -> profiles.plan (call on-demand from /billing page)
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'unauthorized' }, 401);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return j({ plan: 'none', error: 'stripe_not_configured' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user?.email) return j({ error: 'unauthorized' }, 401);

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const admin = createClient(supabaseUrl, serviceKey);

    if (!customers.data[0]) {
      await admin.from('profiles').update({ plan: 'none', stripe_customer_id: null, stripe_subscription_id: null, current_period_end: null }).eq('id', user.id);
      return j({ plan: 'none' });
    }

    const customer = customers.data[0];
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
    const sub = subs.data[0];

    let plan: 'none' | 'starter' | 'pro' = 'none';
    if (sub) {
      const amount = sub.items.data[0]?.price?.unit_amount || 0;
      if (amount >= 4000) plan = 'pro';
      else if (amount > 0) plan = 'starter';
    }

    await admin.from('profiles').update({
      plan,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub?.id || null,
      current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    }).eq('id', user.id);

    return j({ plan, current_period_end: sub?.current_period_end });
  } catch (e: any) {
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
