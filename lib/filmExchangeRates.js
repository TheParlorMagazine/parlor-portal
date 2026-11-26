const supported=['usd','eur','gbp','cad','aud','jpy']
export async function loadFilmExchangeRates(currencies){
 const foreign=[...new Set(currencies)].filter(c=>c!=='usd')
 if(!foreign.length)return{rates:{usd:1},date:null,provider:'ECB reference rates',unavailable:false}
 if(foreign.some(c=>!supported.includes(c)))return{rates:{usd:1},date:null,provider:'ECB reference rates',unavailable:true}
 try{
  const response=await fetch(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${foreign.map(c=>c.toUpperCase()).sort().join(',')}`,{next:{revalidate:3600},signal:AbortSignal.timeout(8000)})
  if(!response.ok)throw Error('Rate provider unavailable')
  const data=await response.json()
  if(data.base!=='USD'||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Number.isFinite(Date.parse(data.date))||new Date(data.date).toISOString().slice(0,10)!==data.date||(data.amount!=null&&data.amount!==1))throw Error('Invalid exchange rate response')
  const rates={usd:1}
  for(const c of foreign){const quote=data.rates?.[c.toUpperCase()];if(!Number.isFinite(quote)||quote<=0)throw Error('Missing exchange rate');rates[c]=1/quote}
  return{rates,date:data.date,provider:'ECB reference rates',unavailable:false}
 }catch{return{rates:{usd:1},date:null,provider:'ECB reference rates',unavailable:true}}
}
