const states = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'District of Columbia', FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming', PR:'Puerto Rico', VI:'Virgin Islands', GU:'Guam', AS:'American Samoa', MP:'Northern Mariana Islands', AA:'Armed Forces Americas', AE:'Armed Forces Europe', AP:'Armed Forces Pacific',
}
export function shippingRegion(value, country) {
  const region = typeof value === 'string' ? value.trim() : ''
  if (String(country || 'US').toUpperCase() !== 'US') return region
  const upper = region.toUpperCase()
  if (states[upper]) return upper
  const parenthesized = upper.match(/\(([A-Z]{2})\)$/)?.[1]
  if (parenthesized && states[parenthesized]) return parenthesized
  return Object.keys(states).find(code => states[code].toUpperCase() === upper) || region
}
