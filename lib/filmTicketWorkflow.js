import { validateFilmSettings } from './filmTicketSettings'
import {filmImageUrl,filmTrailerSource} from './filmClubMedia'
import { synchronizeFilmProduct } from './filmTicketCommerce'

export async function saveFilmTicketWorkflow({db,screening,settings,actor,publish=false,stripeFactory,salesEnabled=false}) {
 const patch=validateFilmSettings(settings)
 for(const [object,key,valid,label]of [[patch.event,'cover_image_url',filmImageUrl,'cover image'],[patch,'trailer_url',filmTrailerSource,'trailer']]){if(!Object.hasOwn(object,key))continue;const value=object[key];if(value!=null&&typeof value!=='string')throw Error(`Enter a valid ${label} URL.`);object[key]=value?.trim()||null;if(object[key]&&!valid(object[key]))throw Error(`Enter a valid HTTPS ${label} URL.`)}
 if(publish){
  if(!salesEnabled)throw Error('Ticket checkout is disabled for this deployment. Enable Film Club ticket sales before opening sales.')
  if(Date.parse(patch.event.starts_at)<=Date.now()||!patch.event.ends_at||Date.parse(patch.event.ends_at)<=Date.parse(patch.event.starts_at))throw Error('Set a future start and an end time before opening ticket sales.')
  // Publishing happens atomically with opening sales, after Stripe succeeds.
  patch.event={...patch.event,status:screening.event.status}
 }
 const {error:saveError}=await db.rpc('save_film_ticket_settings',{p_event:screening.event_id,p_actor:actor,p_patch:patch})
 if(saveError)throw Error('Settings could not be saved.')
 let stage='media'
 try{
  if(Object.hasOwn(patch.event,'cover_image_url')){
   const {data,error}=await db.from('events').update({cover_image_url:patch.event.cover_image_url?.trim()||null}).eq('id',screening.event_id).select('id').maybeSingle()
   if(error||!data)throw Error('Cover image could not be saved. Your draft is retained; retry Save changes.')
  }
  if(Object.hasOwn(patch,'trailer_url')){
   const {data,error}=await db.from('film_club_screenings').update({trailer_url:patch.trailer_url?.trim()||null}).eq('event_id',screening.event_id).select('event_id').maybeSingle()
   if(error||!data)throw Error('Trailer could not be saved. Your draft is retained; retry Save changes.')
  }
  stage='stripe'
  const {data:current,error}=await db.from('film_club_screenings').select('*,event:events(title,status,is_public,starts_at,ends_at)').eq('event_id',screening.event_id).single()
  if(error||!current)throw Error('Could not reload the saved screening.')
  const finished=Date.parse(current.event.starts_at)<=Date.now()||(current.event.ends_at&&Date.parse(current.event.ends_at)<=Date.now())
  if(!publish&&(finished||current.stripe_archived||current.event.status==='cancelled'))return{ok:true,message:'Changes saved. Ticket sales remain closed.'}
  const needsSync=publish||!current.stripe_product_id||!current.stripe_price_id||current.stripe_synced_version!==current.pricing_version
  if(needsSync)await synchronizeFilmProduct(db,stripeFactory(),current)
  if(publish){
   const {error}=await db.rpc('publish_film_ticket_sales',{p_event:current.event_id,p_actor:actor,p_version:current.pricing_version})
   if(error)throw Error('Could not publish and open sales. Check the dates and current pricing, and apply the ticket workflow migration if it is missing.')
   return{ok:true,message:'Screening published and ticket sales opened.'}
  }
  return{ok:true,message:current.sales_enabled?'Changes saved. Ticket sales remain open.':'Changes saved and Stripe pricing updated. Ticket sales remain paused until you open them.'}
 }catch(error){
  throw Object.assign(Error(`Changes saved, but ${stage==='media'?'screening media could not be fully saved':publish?'ticket sales could not be opened':'Stripe pricing could not be updated'}. ${error.message} ${publish?'Keep the publish checkbox selected and retry Save changes.':'Retry Save changes.'}`),{saved:true})
 }
}
