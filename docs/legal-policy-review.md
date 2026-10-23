# Privacy and Terms drafts — review before publication

The `/privacy` and `/terms` pages are draft templates tailored to the repository's actual member portal, editorial submissions, forums, event attendance, analytics and shop. They are not a legal compliance assessment. Their visible draft label is intentional. Footer links now lead to the pages.

Business review still needs to confirm:

- The legal operator's identity, address, controller details and suitable contact. The draft uses the contact email already present in `app/contact/page.js`.
- Actual operating jurisdictions, customer locations, age requirements, processor agreements, international-transfer safeguards, retention periods and procedures for rights requests. No jurisdiction, address, deletion deadline or specific retention period was invented.
- Whether additional disclosures about sale/sharing, targeted advertising or sensitive information are applicable.
- The exact inventory of live providers and data flows. The draft reflects Supabase, Google sign-in, Stripe, Resend, Cloudinary, Printify, Shippo, hosting, third-party fonts/media and country lookup seen in source, not a production audit.
- Analytics and embedded-content consent/opt-out controls. Publishing a privacy policy does not create consent controls. The current PageViewTracker starts analytics without a consent gate; confirm the requirements for the audiences you serve and implement controls where required.
- Approved business choices: unused physical goods may be returned by requesting a return within 14 calendar days of delivery; the buyer pays change-of-mind return shipping; approved refunds process within 30 calendar days after receipt of returned goods (or approval where no return is needed), subject to shorter statutory deadlines. Confirm the return address, handling process and checkout disclosures. Distinguish faulty goods from change-of-mind returns; print-on-demand alone does not establish a personalized-goods exemption. Digital-content withdrawal exceptions may require checkout consent that must not be assumed from this draft.
- Membership renewal, cancellation, refunds and any legacy external billing agreements. Statutory consumer protections take priority; no blanket no-refund term is added.
- Contribution licensing matches the existing submission consent; commissioned writing requires its own agreement. The draft does not replace existing consent records or change account, payment or publication behavior.

After decisions and qualified legal review, revise any remaining conditional statements, align checkout/product disclosures with the approved refund policy, update the date as appropriate and remove the shared draft label when publishing approved policies. No Supabase migration is required.
