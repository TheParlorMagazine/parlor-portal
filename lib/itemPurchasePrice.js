export function itemPriceMatches(article, itemType, priceId) {
  if (itemType === 'article') return article.paywall_type === 'paywall' && article.stripe_price_id === priceId
  return [...(article.body || '').matchAll(/<div\b([^>]*)>/gi)].some(match => {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
    return attrs['data-type'] === `${itemType}-block` && attrs.paywalled === 'true' && attrs.stripe_price_id === priceId
  })
}

