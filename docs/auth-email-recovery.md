# Auth email recovery

The November signup incident was an SMTP authentication failure (username must be `resend`, not the SMTP port). These changes do not change SMTP configuration, Google OAuth, verification requirements, or welcome/Film Club automation.

Sign-in mail now requires a provider message ID before success. The article wall retains the email and allows retry after HTTP, network, or malformed-response failures. Signup and login offer a separate confirmation resend action through Supabase Auth; password recovery remains separate. A successful request means requested/accepted, not guaranteed inbox delivery.

## Shared limiter rollout

1. Apply `supabase/migrations/20261123180000_auth_email_rate_limit.sql` to the production database using the normal migration process.
2. In Netlify Project configuration → Environment variables, include the Functions scope and Production deploy context; set server environment variable `AUTH_EMAIL_RATE_LIMIT_ENABLED=true` and deploy/redeploy.
3. Check confirmation resend and existing-reader sign-in with an address you control; verify the email and its callback. Test Google sign-in separately.

Until step 2 the shared limiter is disabled, so deploying code before its schema cannot break existing signup. Once enabled, limiter errors return a retryable 503 instead of sending without a budget. All three app endpoints share a budget of 3 requests per email and 20 per trusted Netlify IP per 15 minutes; 429 responses include Retry-After. Email/IP keys are HMAC hashes and expired rows are cleaned during requests. IP limits use Netlify’s `x-nf-client-connection-ip` header only when `NETLIFY=true`, and accept only a valid single IPv4 or IPv6 address. Missing/invalid addresses and non-Netlify deployments retain email limits without an IP bucket; arbitrary forwarding headers are ignored. Supabase's native Auth rate limits still apply, including to direct signup; this limiter does not replace them.

No production configuration, migration, or live delivery is applied by the code change itself.
