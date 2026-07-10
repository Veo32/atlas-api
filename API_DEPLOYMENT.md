# Atlas API Deployment

Deploy this API on a Node.js host such as Render, Railway, VPS, or Hostinger VPS.

Production URL target:

```text
https://api.bakrr.net/v1
```

Required environment variables are listed in `api-production.env.example`.

Recommended commands:

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @aitools/api build
pnpm --filter @aitools/api start
```

Stripe webhook endpoint:

```text
https://api.bakrr.net/v1/billing/webhook/stripe
```

After deployment, update Stripe Dashboard webhook events:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
customer.subscription.deleted
```
