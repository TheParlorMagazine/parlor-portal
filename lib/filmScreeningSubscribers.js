const memberFields='id,full_name,email,plan,newsletter_subscribed,unsubscribed_at'
const normalize=email=>String(email || '').trim().toLowerCase()
export async function screeningContact(db,{email,full_name,createNew=false}) {
 email=normalize(email)
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.')
 const find=async()=>{const {data,error}=await db.from('members').select(memberFields).ilike('email',email.replaceAll('_','\\_').replaceAll('%','\\%')).maybeSingle();if(error)throw new Error('Could not check existing subscribers.');return data}
 const existing=await find();if(existing){if(createNew)throw new Error('Subscriber already exists. Select them from the subscriber search above.');return existing}
 const users=async()=>{for(let page=1;page<=100;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw new Error('Could not check existing accounts.');const found=data.users.find(user=>normalize(user.email)===email);if(found)return found;if(data.users.length<1000)return null}throw new Error('Account lookup exceeded its limit.')}
 let user=await users(),created=false
 if(user&&createNew)throw new Error('Subscriber already exists. Select them from the subscriber search above.')
 if(!user){const {data,error}=await db.auth.admin.createUser({email,email_confirm:true,user_metadata:{plan:'free',full_name:String(full_name || '').trim().slice(0,200)}});if(error){const raced=await find();if(raced){if(createNew)throw new Error('Subscriber already exists. Select them from the subscriber search above.');return raced;}user=await users();if(!user)throw new Error('Could not create this contact. Please retry.');if(createNew)throw new Error('Subscriber already exists. Select them from the subscriber search above.')}else{user=data.user;created=true}}
 // Only a newly created account is enrolled. Existing opt-outs and paid plans are retained.
 if(created){const provisioned=await find();const {error}=await db.from('members').upsert({id:user.id,email,full_name:String(full_name || '').trim().slice(0,200),newsletter_subscribed:true,onboarding_email_sent:true,onboarding_sent:true,...(provisioned?{}:{plan:'free'})},{onConflict:'id'});if(error)throw new Error('Account created, but subscriber details could not be saved. Retry adding the contact.')}
 else {const raced=await find();if(raced){if(createNew)throw new Error('Subscriber already exists. Select them from the subscriber search above.');return raced;}const {error}=await db.from('members').upsert({id:user.id,email,full_name:String(full_name || '').trim().slice(0,200),plan:'free',newsletter_subscribed:true,onboarding_email_sent:true,onboarding_sent:true},{onConflict:'id',ignoreDuplicates:true});if(error)throw new Error('Could not save the subscriber. Please retry.')}
 const saved=await find();if(!saved)throw new Error('Could not load the new subscriber. Please retry.');return saved
}
export async function addScreeningSubscriber(db,eventId,contact){
 const member=await screeningContact(db,contact)
 const {error}=await db.from('film_club_ticket_buyers').upsert({event_id:eventId,email:normalize(member.email)},{onConflict:'event_id,email',ignoreDuplicates:true})
 if(error)throw new Error('Contact saved, but could not be added to this screening. Retry adding them.')
 return member
}
