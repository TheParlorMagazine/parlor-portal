// Read-only provider check. Never return credentials, carrier account objects,
// provider response bodies, or fulfillment addresses to the browser.
export async function checkShippoConnection() {
  const key = process.env.SHIPPO_API_KEY
  const required = ['SHIP_FROM_STREET', 'SHIP_FROM_CITY', 'SHIP_FROM_STATE', 'SHIP_FROM_ZIP', 'SHIP_FROM_COUNTRY']
  const missing = required.filter(name => !process.env[name]?.trim())
  const configuration = { missing, keyPresent: !!key, mode: key?.startsWith('shippo_test_') ? 'test' : key?.startsWith('shippo_live_') ? 'live' : 'unknown' }
  if (!key) return { ...configuration, ok: false, code: 'missing_key', message: 'SHIPPO_API_KEY is missing from this deployment.' }
  let response
  try {
    response = await fetch('https://api.goshippo.com/carrier_accounts/?results=100', {
      method: 'GET', headers: { Authorization: `ShippoToken ${key}`, Accept: 'application/json' },
      cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    })
  } catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error?.name)
    return { ...configuration, ok: false, code: timeout ? 'timeout' : 'connection_failed', message: timeout ? 'Shippo did not respond within 10 seconds.' : 'This deployment could not connect to Shippo.' }
  }
  if (!response.ok) return { ...configuration, ok: false, code: [401,403].includes(response.status) ? 'authentication_failed' : 'provider_error', status: response.status, message: [401,403].includes(response.status) ? 'Shippo rejected this deployment’s credentials or account access.' : `Shippo returned HTTP ${response.status}.` }
  let data
  try { data = await response.json() } catch { return { ...configuration, ok: false, code: 'invalid_response', message: 'Shippo returned an unreadable response.' } }
  if (!Array.isArray(data?.results)) return { ...configuration, ok: false, code: 'invalid_response', message: 'Shippo did not return a carrier account list.' }
  const active = data.results.filter(account => account?.active === true).length
  if (missing.length) return { ...configuration, ok: false, code: 'missing_origin', message: 'Shippo credentials work, but required fulfillment address settings are missing.' }
  if (!active) return { ...configuration, ok: false, code: 'no_active_carriers', message: 'Shippo credentials work, but no active carrier account was returned. Check carrier setup in Shippo.' }
  return { ...configuration, ok: true, code: 'connected', activeCarriers: active, message: 'Shippo authentication and carrier access work. This read-only check does not validate a destination-specific shipping rate.' }
}
