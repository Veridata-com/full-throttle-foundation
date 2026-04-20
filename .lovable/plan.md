

## Goal
Charge 60% off the first month, then full price ($19 / $49) every month after — using only your existing `STRIPE_SECRET_KEY`. No manual Stripe dashboard work required.

## How Stripe handles "first month discount"
Stripe has a built-in concept called a **Coupon** (e.g. "60% off, once"). You attach it to a subscription at checkout. Stripe automatically:
- Applies 60% off the first invoice ($19 → $7.60, $49 → $19.60)
- Charges full price on every renewal after that
- Shows the discount line item on the receipt

The coupon can be created **once, automatically, from code** the first time someone checks out — no dashboard clicking needed.

## Changes

### 1. `supabase/functions/create-checkout/index.ts`
- Change `unit_amount` from discounted cents (760, 1960) back to **full price** (1900, 4900).
- Update product names: remove "Launch 60% off" suffix.
- Add a helper that ensures a Stripe coupon `launch60` exists (60% off, duration: `once`). Creates it on first call, reuses it after — idempotent via `stripe.coupons.retrieve` + create-on-404.
- Pass `discounts: [{ coupon: 'launch60' }]` into `stripe.checkout.sessions.create`.
- Keep `allow_promotion_codes: false` (otherwise the discount field is hidden in checkout UI when discounts are pre-applied — Stripe limitation).

### 2. `supabase/functions/check-subscription/index.ts`
- Update the price-detection thresholds to match full price: `amount >= 4000 → pro`, `amount > 0 → starter`. (Currently `>= 4000` works for $49 but the comment is wrong; just clean it up so renewals at full price still classify correctly.)

### 3. UI copy (`Onboarding.tsx`, `Billing.tsx`, `CountdownBanner.tsx`)
- Keep the "$7.60 / $19.60" display and the strike-through "$19 / $49".
- Add small print under the price: **"$7.60 first month, then $19/mo"** (and same for Pro). This is required for legal clarity and prevents chargebacks from confused users.

## What you need to do
**Nothing.** Your `STRIPE_SECRET_KEY` is already configured. The coupon is created automatically on the first checkout. You don't need to touch the Stripe dashboard.

Optional: if you ever want to end the launch promo, just remove the `discounts:` line from `create-checkout` — full price kicks in immediately for new signups. Existing subscribers already on full price (month 2+) are unaffected.

## Technical notes
- Coupon ID `launch60` is hardcoded and reused across all checkouts.
- `duration: 'once'` is what makes it apply only to the first invoice.
- The Stripe customer portal will correctly show "Discount applied: 60% off (1 month)" on the active subscription until it expires.

