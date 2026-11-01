# Google Merchant Center product feed

After deployment, use this public XML feed as a **scheduled file fetch** data source in Google Merchant Center:

https://theparlormagazine.com/api/feeds/google-shopping.xml

Choose **United States**, **English**, and **USD** for this first feed. Set a daily fetch (or the shortest schedule Merchant Center offers). The endpoint reads Supabase on request and caches successful responses for five minutes. It requires no feed password, extra paid platform, new secret, database migration, or product upload job.

## Included products

Active, locally purchasable physical `shop_products` with a positive price, description and HTTP(S) product image. Links always point to the public `/shop/{id}` page. The first variant is used because that is the option initially selected on the landing page; its price and inventory override the parent where set. This version advertises one default offer per product, not every size/color option. Sold-out products remain in the feed as `out_of_stock`; null inventory follows the shop's unlimited/print-on-demand convention. Printify inventory is only as current as the catalogue data—it is not queried live from the provider.

Excluded: inactive products, external/partner checkout, nonphysical fulfillment modes, configurable pick-your-own bundles, products without required content, unready Printify products, and products restricted away from the United States. Separate `shop_bundles` are not advertised by this version. Nothing writes to Supabase or changes checkout, stock, orders, newsletter settings, or fulfillment.

Product pages also emit server-rendered Product/Offer JSON-LD from the same eligible catalogue fields. The offer currency follows the same country headers as the storefront's geo currency. Missing products or a failed structured-data read preserve the existing product page without emitting fabricated offers. The feed returns a noncached 503 on database errors rather than an apparently empty successful catalogue.

## Merchant Center setup and checks

1. Verify and claim `theparlormagazine.com` in Merchant Center. The shop Google verification tag has already been added separately.
2. Add a product data source using the feed URL above and configure scheduled fetching. Fetch once to inspect results.
3. Configure shipping rates/delivery times, return policy and applicable tax settings in Merchant Center to match the real checkout. The feed does not invent shipping costs or delivery promises.
4. Review **Needs attention / Diagnostics**. Some products require manufacturer brand and GTIN/MPN data, or additional category-specific attributes. The existing CMS has no dedicated verified identifier fields, so none are invented, and `identifier_exists=no` is not asserted. Add verified manufacturer details in Merchant Center where requested; apparel and other categories may require size/color/age/gender attributes before approval. A valid feed is not a guarantee of listing approval.
5. Test a product URL with Google's Rich Results Test and URL Inspection. Merchant Center and Google control review, recrawl timing and placement.

The product condition is `new`, matching this shop's retail catalogue. Do not add used/refurbished inventory to this feed without extending the condition mapping. Merchant Center fetches are read-only and don't send emails or create purchases.

## Printify images

Images from `images.printify.com` and `images-api.printify.com` are presented through public first-party URLs under `/shop/product-image/{product-id}/{image-index}?v=...`. The feed, Product JSON-LD and public storefront product API use the same URLs. The original database image URLs and fulfillment identifiers are unchanged. Cloudinary, Wix and other image hosts remain unchanged.

The image endpoint looks up an active product, accepts only those two HTTPS source hosts, refuses redirects, limits downloads to 8 MiB and image decoding to 40 million pixels, and serves an actual normalized JPEG. Successful images are cached at the CDN for a day; changing an upstream URL changes the generated cache key. A failed download returns an uncached 503, never a placeholder that might misrepresent the product. This needs no migration or new credentials. First-party serving avoids requiring Google to fetch Printify directly, but cannot recover an upstream image that Printify will not deliver to the server. After publishing, open an affected product's new image URL, then refresh the Merchant Center feed and allow Google to recrawl.
