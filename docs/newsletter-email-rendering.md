# Newsletter email rendering

The editor's mobile iframe is a browser preview. Gmail can strip embedded CSS or use a wider layout viewport, and dark mode can recolor HTML backgrounds. Preview success alone does not verify inbox rendering.

## Static artwork

The issue promo and Print Trio supplied by the owner are public Supabase `Media` WebP uploads. The previous Cloudinary-only URL transformation did not touch them. Newsletter artwork now uses a public `/email-image` endpoint which fetches an allowlisted original and uses Sharp to flatten static alpha onto white or `#fdf0f3`, then returns an opaque JPEG. The header logos use white-backed versions too so black lettering remains readable when Gmail darkens the surrounding HTML. The original media files and database values are not modified.

Supported origins are this site's public Supabase Media bucket and its Cloudinary upload account. Arbitrary hosts, private/signed Supabase storage, ports, credentials and redirects are rejected. Versioned Cloudinary URLs resolve to the original asset before format/background transformations. Background choices are restricted, fetching times out, and input bytes and decoded pixels are bounded. Successful output is cacheable; errors are not replaced with fake images or cached as success. Animated uploads retain their animation and are not part of the static-artwork flattening guarantee. Unknown external image origins retain their original URLs.

The route is intentionally unauthenticated so Gmail's image proxy can retrieve email artwork. It needs the existing Sharp dependency, no new keys, database migration or user session. Supabase and Cloudinary public media origins are allowlisted in `lib/emailImages.js`; changing media providers requires reviewing that allowlist. Hosting must permit public access to `/email-image`.

## Layout

The actual sent document now includes a doctype, head, viewport meta and responsive styles in the head. Inline defaults use reduced side padding, full-width stacked announcement image/text, stacked shop items and stacked issue/support buttons. Desktop side-by-side presentation is an enhancement applied only when both viewport and device width exceed 480px. Clients that strip styles keep the readable stacked baseline, including a phone client using a virtual desktop-width viewport. Main content uses 12px side padding on the mobile baseline; nested cards also use 12px instead of accumulating the desktop's 24–28px insets.

The preview and subscriber sends share `buildNewsletter`; `emailWithFooter` inserts the recipient footer inside that document. New output only affects fresh tests and new campaigns. A retry of a previously saved campaign intentionally uses its saved snapshot; it does not silently replace old content or resend accepted recipients. Emails already received cannot be rewritten. Regenerate a fresh test after deployment.

## Validation and remaining live check

Tests process actual transparent WebP bytes through the public-image handler and decode the resulting JPEG to verify no alpha channel and white/pink pixels. Browser tests render the real newsletter HTML at mobile/desktop sizes, with styles present, all embedded styles removed, and a mobile device with a wider virtual layout viewport. They check stacking, padding, link destinations and horizontal overflow. Provider failures, unsafe sources and oversized bodies are covered.

The execution environment cannot fetch the live public URLs through its network proxy. No real email was sent during this work. After deployment, send a fresh newsletter test to Gmail and compare desktop, mobile light mode and mobile dark mode. Gmail may recolor text/backgrounds; opaque image pixels are generated server-side. Recipients can still save received images, and hiding Gmail's download affordance cannot be guaranteed.
