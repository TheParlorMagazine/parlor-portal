// Select the requested products from the same active catalogue as shop cards.
export function selectBonesProducts(products) {
  const text = product => [product.name, product.variant, product.description, product.external_url].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  const matches = [
    s => /marshmallow/.test(s) && /hot (chocolate|cocoa)/.test(s),
    s => /jack(ed)?\s*(o\s*)?lantern/.test(s),
    s => /col[ou]mbia(n)?/.test(s) && /coffee|bones/.test(s),
  ]
  // Prefer explicitly branded entries when the catalogue has similar names.
  const catalogue = [...products].sort((a, b) => Number(/bones/.test(text(b))) - Number(/bones/.test(text(a))))
  const used = new Set()
  return matches.map(match => {
    const product = catalogue.find(p => !used.has(p.id) && match(text(p)))
    if (product) used.add(product.id)
    return product
  }).filter(Boolean)
}
