# Newsletter Announcement editor

Only the newsletter Announcement block changes. The campaign editor, issue promotion, article/event/shop blocks, and support copy are unchanged.

The editor supports bold, italic, underline, paragraphs and links, with no image extension, image toolbar, pasted file or dropped file support. Images remain in the existing upload/URL/media-library field. Layout choices are full-width above the text, full-width after a chosen paragraph, and a 140px left/right thumbnail with wrapping. Inline email styles and the image align attribute provide fallbacks; actual wrapping depends on the recipient's email client, particularly Outlook. No emails were sent during automated tests.

No migration is required. The existing issues.newsletter_announcement text column stores a versioned JSON envelope with kind newsletter_announcement, version 1, html, layout and after. Existing plain text continues through the original renderer until edited. Opening the editor upgrades its draft while preserving text; only Save announcement persists it. The same encoded value travels through the existing preview, test, review, send and retry paths. HTML is rendered server-side through a parser-backed allowlist: paragraphs, breaks, strong/emphasis/underline, and safe links. Images and executable content from rich text are discarded; the separate announcement image remains supported.

Tests cover markup sanitization, unsafe links, plain-text compatibility, empty content, all layouts, unrelated newsletter content, editor formatting and links, layout reload, desktop/mobile iframe previews and existing newsletter layout/test-email behavior.
