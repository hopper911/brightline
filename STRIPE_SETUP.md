# Stripe (Studio OS invoices)

## Required environment variables

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

- **Never** expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the browser. They are server-only.
- Checkout **success** and **cancel** URLs are built from `NEXT_PUBLIC_SITE_URL` only (not client input).

## Local webhook testing

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret the CLI prints into `STRIPE_WEBHOOK_SECRET` for local runs.

## Production webhook endpoint

Register this URL in the Stripe Dashboard (**Developers → Webhooks**):

`https://yourdomain.com/api/stripe/webhook`

Subscribe at least to:

- `checkout.session.completed`
- `payment_intent.payment_failed`
- `charge.refunded`

Invoice payment status and package delivery unlock are updated **only** after Stripe verifies the webhook signature and (for Checkout) the session is `paid` with an amount matching the invoice balance in the database.

## Verify before deploy

```bash
npx prisma generate
npx tsc --noEmit
npx eslint ...
```

## Admin flow

1. Open an invoice in **Studio → Finance**.
2. Use **Create Stripe Checkout link** (or **Refresh** after invoice changes).
3. Share the hosted Checkout URL with the client, or let them use **Pay Now** on the delivery package page when a link exists.
