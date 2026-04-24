// Create a Stripe Checkout session — full price with auto-applied 60% off first month coupon
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Full monthly price. Starter uses a special $0.99 first-month coupon for early beta adopters.
// Pro keeps the launch 60% off first month.
const PRICES: Record<string, { amount: number; name: string; couponId: string }> = {
  starter: { amount: 1900, name: 'AdRise Starter', couponId: 'beta099' },
  pro:     { amount: 4900, name: 'AdRise Pro',     couponId: 'launch60' },
};

const COUPONS: Record<string, { amount_off?: number; percent_off?: number; currency?: string; name: string }> = {
  beta099:  { amount_off: 1801, currency: 'usd', name: 'Early beta — $0.99 first month' }, // 19.00 - 0.99 = 18.01
  launch60: { percent_off: 60, name: 'Launch 60% off (first month)' },
};

async function ensureCoupon(stripe: Stripe, id: string) {
  try {
    await stripe.coupons.retrieve(id);
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.code === 'resource_missing') {
      const c = COUPONS[id];
      await stripe.coupons.create({
        id,
        duration: 'once',
        name: c.name,
        ...(c.amount_off ? { amount_off: c.amount_off, currency: c.currency } : {}),
        ...(c.percent_off ? { percent_off: c.percent_off } : {}),
      });
    } else {
      throw e;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'unauthorized' }, 401);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return j({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY in project secrets.' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user?.email) return j({ error: 'unauthorized' }, 401);

    const { plan, origin } = await req.json();
    if (!plan || !PRICES[plan]) return j({ error: 'invalid plan' }, 400);

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    const couponId = PRICES[plan].couponId;
    await ensureCoupon(stripe, couponId);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: 'subscription',
      discounts: [{ coupon: couponId }],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: PRICES[plan].name },
          unit_amount: PRICES[plan].amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });

    return j({ url: session.url });
  } catch (e: any) {
    console.error('create-checkout error', e);
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
