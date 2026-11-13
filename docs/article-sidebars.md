# Article sidebar announcements

Use **Announcements → Article sidebar** to configure the two article-side slots. Both existing banners appear automatically: the Trick-or-Treat announcement on the left and Bones Coffee store cards on the right. Viewing the editor never seeds or changes live data. The defaults reuse the original TrickOrTreatStrip and BonesCoffeeBanner components and the same live catalogue selection; no sample preview imagery is saved or substituted.

Each slot supports two formats:

- **Announcement:** headline, kicker, message, button label/link and up to six uploaded/linked images, GIFs or videos. The existing Trick-or-Treat scene can remain as the original announcement's visuals or be replaced with custom media.
- **Store banner:** headline, kicker, message, shop link and an active-catalogue item picker. Choose up to six products, remove them or reorder the cards. Current product names/images and product-page links come from the shop catalogue. Inactive/missing products cannot be newly saved as active selections and are omitted from public cards if availability changes later.

Both formats have Left/Right, active and scheduling controls. An occupied target side requires explicit replacement confirmation, including when saving a hidden replacement. Moving a configured sidebar switches its old slot off and writes the target slot in one database upsert request. Each side has one authoritative primary-key record, so concurrent saves cannot create two visible sidebars on the same side. Creating a new sidebar configures/replaces a slot rather than adding another independently visible card.

Storage uses the existing `announcements` table, placement `article_sidebar`, and a versioned configuration in its existing `image_url` text column. The existing announcement primary key identifies the left and right slots. No table, column, migration or database function is added. A saved inactive or scheduled slot always overrides its historical/default fallback. Legacy rows are normalized when edited; legacy duplicate rows cannot override an authoritative slot. Removal through the API disables a sidebar rather than reactivating its default.

The public article component reads the configured pair instead of mounting the two hardcoded banners. On wide screens the cards stay outside the central reading column and show while the article body is in view. On smaller screens they stack below the article, keeping media controls and item links accessible without covering text. Shop popup controls remain separate. Article-sidebar announcements are excluded from footer/homepage ribbon rotation.

Validation: real admin/public route browser coverage for both formats, media fields, item selection/order, left/right placement, replacement confirmation, atomic moves, disabled slots, failed saves and mobile layout; service tests for authorization, canonical-slot uniqueness, schedules/default suppression, media safety, active product validation and ribbon isolation. No live announcements were changed during development.
