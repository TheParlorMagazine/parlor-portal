# Newsletter artwork and mobile layout

Newsletter static artwork uses `/email-art/{background}/{source-host}/{source-path}`. Every source and background has a distinct pathname, avoiding reliance on query strings as cache keys. Header MARK and LOGO URLs remain unchanged. Original media uploads and database values remain unchanged. Supabase public Media and the Parlor Cloudinary account are allowlisted; redirects, arbitrary origins, credentials, oversized files and excessive decoded pixels are rejected. Static images are flattened to white or pale pink JPEG pixels. Animated files retain their original bytes.

The previous query-only image endpoint showed repeated logo artwork in production. A cache-key collision is a suspected cause, not a confirmed diagnosis. The old endpoint is not reintroduced. Tests now verify distinct artwork URL paths, distinct decoded pixels for distinct sources, correct white/pink flattening, and unchanged header source URLs.

Email inline styles default to stacked announcements, products and buttons with 12px side padding. Desktop columns are an enhancement requiring both viewport and device width above 480px. The full HTML document places media CSS in the head. Browser tests cover mobile, desktop, a phone with a wide virtual viewport and removed embedded CSS. Unsupported media-query clients retain the stacked layout on desktop too.

Live upstream fetching and Gmail inbox rendering were not verified in this environment. After deployment, compare a fresh Gmail test with the original artwork in light and dark mode. Previously received messages and saved campaign retry snapshots are not rewritten. Gmail controls whether recipients can save images.
