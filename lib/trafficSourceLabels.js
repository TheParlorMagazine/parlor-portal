// Presentation only: keep Google's original attribution in reports and exports.
export const TRAFFIC_COLUMNS = {
  'Source / medium': 'Where visitors came from',
  Sessions: 'Visits',
  'Active users': 'Active visitors',
  'Engaged sessions': 'Engaged visits',
  'Key events': 'Key actions',
}
export function trafficSourceLabel(value) {
 const raw=String(value || '')
 if(raw==='(direct) / (none)')return {title:'Direct / no source identified',detail:'Google could not identify a referring website or campaign.'}
 if(!raw || raw==='(not set)')return {title:'Source unavailable',detail:'Google did not record a source for these visits.'}
 const split=raw.lastIndexOf(' / '),site=split<0?raw:raw.slice(0,split),medium=split<0?'':raw.slice(split+3)
 if(/(^|\.)filesusr\.com$/i.test(site))return {title:'Hosting-domain referral',detail:'This may be a site asset or embedded page rather than a new audience source. Review attribution in Google Analytics.'}
 const types={organic:'Organic search',referral:'Website referral',email:'Email',cpc:'Paid search',social:'Social media',paid_social:'Paid social'}
 return {title:types[medium]?`${site} · ${types[medium]}`:raw,detail:''}
}
