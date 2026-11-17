# About pages

Mission (`/about/mission`) and Editorial Standards (`/about/editorial-standards`) share the approved About hero and sticky navigation. The hero artwork is decorative, hosted at the provided Cloudinary URL. Desktop parallax and scroll reveals respect reduced-motion preferences. Content is visible without JavaScript.

Mission uses a flat section index and viewport-height sections on desktop; mobile sections flow naturally. Editorial Standards starts with an always-visible introduction and four native accordions. Only the editorial verticals have an internal section index. The exclusions and AI policy are bullet lists. Reviewed static editorial markup is checked in as `content.json`; it must not be replaced with untrusted HTML.

The latest issue link follows the homepage's published article/issue relationship. The lookup is limited to three seconds and falls back to `/print` if discovery is unavailable. All four existing verticals are retained. The People page remains at its existing route; Support Us and donation links use the existing `/buy-us-a-birthday-gift` page. These changes require no database migrations or new environment variables.
