// Stock packaging estimates. Metric dimensions are authoritative for boxes.
export const PACKAGE_SIZES = [
  { id: 'small', label: 'Small — 15 × 10 × 10 cm', dimensions: [15, 10, 10] },
  { id: 'medium', label: 'Medium — 30 × 22 × 15 cm', dimensions: [30, 22, 15] },
  { id: 'large', label: 'Large — 45 × 35 × 25 cm', dimensions: [45, 35, 25] },
  { id: 'media', label: 'Media mailer — 12 × 9 × 0.5 in (one book or magazine)', dimensions: [30.48, 22.86, 1.27] },
]
export const packageSize = id => PACKAGE_SIZES.find(p => p.id === id)
const volume = d => d.reduce((a, b) => a * b, 1)
const rotations = ([a,b,c]) => [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]]

// Conservative rectangular packing using each selected single-item package as
// its occupied space. Never assume multiple items fit the single-media mailer.
function pack(units, profile) {
  const spaces = [profile.dimensions.slice()]
  const packed = [], remaining = []
  for (const unit of units) {
    let match
    for (let i=0; i<spaces.length && !match; i++) {
      const rotation = rotations(unit.dimensions).find(d => d.every((v,j) => v <= spaces[i][j] + 1e-8))
      if (rotation) match = { i, rotation }
    }
    if (!match) { remaining.push(unit); continue }
    const [x,y,z] = spaces.splice(match.i,1)[0], [a,b,c] = match.rotation
    spaces.push([x-a,y,z],[a,y-b,z],[a,b,z-c])
    packed.push(unit)
  }
  return { packed, remaining }
}

export function manualParcels(lines) {
  let units = []
  const separateParcels = []
  for (const { product, qty, separate = false } of lines) {
    const profile = packageSize(product.packaging_size)
    if (!profile) throw new Error('An item is missing its packaging size. Please contact us before ordering.')
    const weight = Number(product.weight_oz)
    if (!Number.isFinite(weight) || weight <= 0) throw new Error('An item is missing its shipping weight. Please contact us before ordering.')
    if (!Number.isInteger(qty) || qty < 1 || qty > 400) throw new Error('Invalid shipping quantity.')
    for (let i=0; i<qty; i++) {
      if (separate) {
        const [length, width, height] = profile.dimensions
        separateParcels.push({ length: String(length), width: String(width), height: String(height), distance_unit: 'cm', weight: String(weight), mass_unit: 'oz' })
      } else units.push({ dimensions: profile.dimensions, weight })
    }
  }
  units.sort((a,b) => volume(b.dimensions)-volume(a.dimensions))
  const profiles = PACKAGE_SIZES.slice().sort((a,b) => volume(a.dimensions)-volume(b.dimensions))
  const parcels = []
  while (units.length) {
    let chosen
    for (const profile of profiles) {
      if (profile.id === 'media' && units.length !== 1) continue
      const result = pack(units, profile)
      if (!result.remaining.length) { chosen = { profile, ...result }; break }
    }
    if (!chosen) chosen = { profile: packageSize('large'), ...pack(units, packageSize('large')) }
    if (!chosen.packed.length) throw new Error('These items need a custom shipping package. Please contact us.')
    const [length,width,height] = chosen.profile.dimensions
    parcels.push({ length: String(length), width: String(width), height: String(height), distance_unit: 'cm', weight: String(chosen.packed.reduce((s,u)=>s+u.weight,0)), mass_unit: 'oz' })
    units = chosen.remaining
  }
  return [...parcels, ...separateParcels]
}
