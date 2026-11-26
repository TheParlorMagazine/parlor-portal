import { serviceClient } from './apiAuth'
import { archiveFinishedFilmProducts } from './filmTicketLifecycle'
import { syncPendingFilmFees } from './filmTicketFees'
export async function maintainFilmTickets(stripe) {
 const db=serviceClient()
 let fees,archive
 try{fees=await syncPendingFilmFees(db,stripe,{limit:2})}catch{fees={updated:0,pending:0,unavailable:true}}
 const permitted=process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || process.env.FILM_CLUB_LIVE_STRIPE_APPROVED==='true'
 if(permitted){try{archive=await archiveFinishedFilmProducts(db,stripe,{limit:1})}catch{archive={archived:0,failed:1}}}
 else archive={archived:0,failed:0,paused:true}
 return{fees,archive}
}
