# Public sitemap

After deployment, submit **https://theparlormagazine.com/sitemap.xml** in Search Console → Sitemaps. It is also declared in `/robots.txt`.

The new Next.js site does not generate Wix's old `blog-posts-sitemap.xml`, `blog-categories-sitemap.xml`, `pages-sitemap.xml`, or dynamically named writer/member sitemap files. After the new sitemap successfully loads, remove the obsolete submitted sitemap from Search Console if desired. Removing a sitemap submission does not remove indexed pages. Google may retain old crawl-error history until it revisits/reprocesses the new sitemap.

The XML contains actual public page routes: published article URLs (including republished articles and public paid-article landing pages), issue pages linked by published articles, active shop product and bundle pages, the site's main public sections, and Borderlands chapter pages. It excludes drafts, future-dated posts, private admin/member pages, authentication/checkout flows, preview URLs, and the `/library` redirect to the member portal. Under-construction contact/people pages are not listed. Product eligibility for Merchant Center is independent of sitemap inclusion.

All URLs use the canonical non-www domain. Dynamic data is read in 500-row pages to avoid Supabase result limits. Last-modified dates are only included when backed by a valid existing publication/product update date; no fake current timestamps are added. On database errors, the endpoint returns an uncached 503 instead of presenting a partial catalogue as a successful sitemap. Successful responses cache for five minutes. No migration, member-data query or database write is involved.

Once Netlify has published the change, open the sitemap directly to confirm XML, then submit its URL in Search Console. The absence of styling in a browser XML viewer is normal. Sitemap submission helps discovery and does not guarantee indexing or immediate disappearance of historical errors.
