# About pages

Mission (`/about/mission`) and Editorial Standards (`/about/editorial-standards`) share the approved About hero and sticky navigation. The hero artwork is decorative, hosted at the provided Cloudinary URL. Desktop parallax and scroll reveals respect reduced-motion preferences. Content is visible without JavaScript.

Mission uses a flat section index and viewport-height sections on desktop; mobile sections flow naturally. Editorial Standards starts with an always-visible introduction and four native accordions. Only the editorial verticals have an internal section index. The exclusions and AI policy are bullet lists. Reviewed static editorial markup is checked in as `content.json`; it must not be replaced with untrusted HTML.

The latest issue link follows the homepage's published article/issue relationship. The lookup is limited to three seconds and falls back to `/print` if discovery is unavailable. All four existing verticals are retained. The People page remains at its existing route; Support Us and donation links use the existing `/buy-us-a-birthday-gift` page. These changes require no database migrations or new environment variables.

Mission focus areas include two curated article cards each, fetched in one bounded query for published, non-future articles. Titles and thumbnails come from the CMS, in the requested order. Missing or unpublished records are omitted. Failed lookups leave the section text intact. The Mission page revalidates hourly.

## Founding team

The Mission collective section and People index use shared founding-team cards with the supplied headshots and roles. Read More links point to `/about/people/lindsey-brock-morales` and `/about/people/alexandria-turnley`; unknown profile slugs return 404. Lindsey's profile uses the biography explicitly approved by her, including her founding background, product engineering work, hobbies, and location. The shared biography helper can fall back to the existing `writers.bio` record when no approved profile biography is configured. CMS lookup is bounded to three seconds. The confirmed role introduction is used if a biography is unavailable. Alexandria’s short biography is based on the LinkedIn profile PDF supplied by the user (Profile (3).pdf) and the user-provided role at The Parlor. Her email and other personal contact details from the PDF are not published. No career history has been inferred or invented.

## Contributing writers

The People page uses three category pills, with Founding Team selected by default. The Contributing Writers directory reads all named, slugged writer records through paginated queries and sends only IDs, names, slugs, and safe photo URLs to the client. Name search uses native autocomplete suggestions and accent-insensitive filtering. Each writer has a profile at `/about/people/writers/[slug]`, with a plain-text biography and articles linked through `articles.author_id`, restricted to published records whose publication date has passed. Unknown writer slugs return 404; CMS failures are not converted into false 404s. Fellows remains an empty category pending a supplied roster. No schema changes are required.
