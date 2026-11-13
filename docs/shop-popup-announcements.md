# Shop popup in Announcements

Use **Admin → Announcements → Shop popup** to toggle the floating shop card, edit its headline/message/kicker, button text/link, schedule, and visuals. The default card is shown in the list even before any configuration is saved. Toggling or editing it creates its configuration in the existing `announcements` table; there is no migration, automatic seed or new table.

Choose **Original Trick-or-Treat animation** to keep the current scene and product slots with editable copy. Choose **Custom images, GIFs and videos** to replace that scene with up to six mixed assets. Upload through the existing Cloudinary endpoint or paste site-relative/HTTPS media URLs; set each asset's type and description and reorder/remove it. Videos use playback controls and `preload="none"`; GIFs bypass image compression to preserve animation. Custom media retains the black/pink card styling, dismissal, mobile scroll trigger and spacing above Cookie preferences.

The singleton uses placement `shop_popup`. Existing text, CTA, active and schedule columns store the configuration; the existing `image_url` text column stores a versioned media manifest for this placement only. Other announcement placements retain their existing format and behavior. The public configuration endpoint reads inactive rows as well as active ones, so switching the card off cannot accidentally reactivate its default. No saved configuration means the original animation remains the default. A configuration lookup failure hides the shop card rather than showing an unmanaged fallback.

The shop popup is excluded from homepage/footer ribbon rotation. The default animation on article pages is independent. Public configuration is fetched on page entry and window focus without polling. Dismissal lasts for the session and configuration content; editing the campaign creates a fresh dismissal key.

Authorized announcement roles remain admin/editor/social_admin. URLs and media manifests are validated server-side; existing shop configurations cannot bypass validation by changing placement. Saves fail visibly if the existing announcement columns are unavailable rather than silently creating a ribbon. No live announcement was edited during implementation.

Validation covers save/toggle persistence, inactive and scheduled configurations, authorization, media/link validation, mixed GIF/video uploads, responsive editor/card layout, dismissal, cookie-button spacing, and default article/shop animation regressions.
