const fields=['creation_id','ticket_url','trailer_url','currency','ticket_price_cents','member_discount_percent','member_ticket_limit','acquisition_cost_cents','host_share_percent','host_share_eligibility','license_price_cents','license_threshold','viewing_start','viewing_end']
const details=['filmmaker','synopsis','provider','language','subtitles','qa','runtime_minutes','format','fulfillment_method','other_cost_cents']
export const filmEditorDraftKey=id=>`parlor-film-editor-v1:${id}`
const valid=value=>value==null||typeof value==='string'||(typeof value==='number'&&Number.isFinite(value))
export function filmEditorValues(screening){
 const values=Object.fromEntries(fields.filter(key=>key in screening&&valid(screening[key])).map(key=>[key,screening[key]]))
 values.event=Object.fromEntries(['title','description','starts_at','ends_at','capacity','cover_image_url'].filter(key=>key in (screening.event||{})&&valid(screening.event[key])).map(key=>[key,screening.event[key]]))
 values.ticket_settings=Object.fromEntries(details.filter(key=>key in (screening.ticket_settings||{})&&valid(screening.ticket_settings[key])).map(key=>[key,screening.ticket_settings[key]]))
 return values
}
export function readFilmEditorDraft(id,storage){try{const item=JSON.parse(storage.getItem(filmEditorDraftKey(id)));if(item?.version!==1||item.eventId!==id||!Number.isFinite(item.savedAt)||item.savedAt>Date.now()||Date.now()-item.savedAt>7*86400000||!item.values||typeof item.values!=='object')return null;return {...item,publish:item.publish===true,values:filmEditorValues(item.values)}}catch{return null}}
export function writeFilmEditorDraft(id,screening,publish,storage){storage.setItem(filmEditorDraftKey(id),JSON.stringify({version:1,eventId:id,savedAt:Date.now(),values:filmEditorValues(screening),publish:!!publish}))}
export function mergeFilmEditorDraft(screening,draft){return draft?{...screening,...draft.values,event:{...screening.event,...draft.values.event},ticket_settings:{...screening.ticket_settings,...draft.values.ticket_settings}}:screening}
