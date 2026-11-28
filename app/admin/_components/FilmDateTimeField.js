'use client'
import {useEffect,useId,useRef,useState} from 'react'
import styles from './FilmClubAdmin.module.css'
const pad=n=>String(n).padStart(2,'0')
const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const display=d=>`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
function parse(text){
 const iso=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text)
 const local=/^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})$/.exec(text)
 if(!iso&&!local)return null
 const [y,m,d,h,min]=iso?iso.slice(1).map(Number):[local[3],local[2],local[1],local[4],local[5]].map(Number)
 const date=new Date(y,m-1,d,h,min)
 return y>=1000&&y<=9999&&date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&date.getHours()===h&&date.getMinutes()===min?date:null
}
export default function FilmDateTimeField({label,value,onChange,name,required=false}){
 const id=useId(),input=useRef(null),panel=useRef(null),trigger=useRef(null),focusDay=useRef(false)
 const [internal,setInternal]=useState(''),[text,setText]=useState(''),[open,setOpen]=useState(false)
 const actual=value===undefined?internal:value
 const selected=actual&&Number.isFinite(Date.parse(actual))?new Date(actual):null
 const [month,setMonth]=useState(()=>new Date(selected?.getFullYear() || new Date().getFullYear(),selected?.getMonth() ?? new Date().getMonth(),1))
 const [focused,setFocused]=useState(()=>dayKey(selected || new Date()))
 useEffect(()=>{setText(actual&&Number.isFinite(Date.parse(actual))?display(new Date(actual)):'');input.current?.setCustomValidity('')},[actual])
 function update(date){if(date){date=new Date(date);date.setSeconds(0,0)}const iso=date?.toISOString() || '';setText(date?display(date):'');input.current?.setCustomValidity('');if(value===undefined)setInternal(iso);onChange?.(iso || null)}
 function close(){panel.current?.hidePopover?.();setOpen(false);trigger.current?.focus()}
 function show(){const d=selected || new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1));setFocused(dayKey(d));focusDay.current=true;setOpen(true)}
 useEffect(()=>{
  if(!open)return
  const el=panel.current
  const toggle=e=>{if(e.newState==='closed')setOpen(false)}
  const outside=e=>{if(!el.contains(e.target)&&!trigger.current?.contains(e.target)&&e.target!==input.current){el.hidePopover?.();setOpen(false)}}
  el.addEventListener('toggle',toggle);document.addEventListener('pointerdown',outside,true)
  if(el.showPopover)el.showPopover()
  else el.style.display='block'
  function position(){const r=input.current.getBoundingClientRect(),p=el.getBoundingClientRect();el.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-p.width-8))}px`;el.style.top=`${Math.max(8,Math.min(r.bottom+6,window.innerHeight-p.height-8,r.top-p.height-6>=8&&window.innerHeight-r.bottom<p.height?r.top-p.height-6:Infinity))}px`}
  position();window.addEventListener('resize',position);window.addEventListener('scroll',position,true)
  if(focusDay.current){el.querySelector(`[data-day="${focused}"]`)?.focus({preventScroll:true});focusDay.current=false}
  return()=>{el.removeEventListener('toggle',toggle);document.removeEventListener('pointerdown',outside,true);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true)}
 },[open])
 useEffect(()=>{if(open&&focusDay.current){panel.current?.querySelector(`[data-day="${focused}"]`)?.focus({preventScroll:true});focusDay.current=false}},[focused,month,open])
 const first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first)
 start.setDate(1-(first.getDay()+6)%7)
 const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})
 const active=days.some(d=>dayKey(d)===focused)?focused:dayKey(first)
 const base=selected || new Date()
 function pick(d){const date=new Date(d.getFullYear(),d.getMonth(),d.getDate(),base.getHours(),base.getMinutes());update(date);setMonth(new Date(d.getFullYear(),d.getMonth(),1));setFocused(dayKey(d));focusDay.current=true}
 function keyboard(e,d){
  let next=new Date(d),handled=true
  if(e.key==='ArrowLeft')next.setDate(d.getDate()-1)
  else if(e.key==='ArrowRight')next.setDate(d.getDate()+1)
  else if(e.key==='ArrowUp')next.setDate(d.getDate()-7)
  else if(e.key==='ArrowDown')next.setDate(d.getDate()+7)
  else if(e.key==='Home')next.setDate(d.getDate()-(d.getDay()+6)%7)
  else if(e.key==='End')next.setDate(d.getDate()+6-(d.getDay()+6)%7)
  else if(['PageUp','PageDown'].includes(e.key)){next=new Date(d.getFullYear(),d.getMonth()+(e.key==='PageUp'?-1:1)*(e.shiftKey?12:1),1);next.setDate(Math.min(d.getDate(),new Date(next.getFullYear(),next.getMonth()+1,0).getDate()))}
  else handled=false
  if(handled){e.preventDefault();focusDay.current=true;setFocused(dayKey(next));setMonth(new Date(next.getFullYear(),next.getMonth(),1))}
 }
 function setTime(part,n){const d=new Date(base);if(part==='hour')d.setHours(n);else d.setMinutes(n);update(d)}
 function timeKey(event,part,n,count){let next;if(event.key==='ArrowDown')next=(n+1)%count;else if(event.key==='ArrowUp')next=(n+count-1)%count;else if(event.key==='Home')next=0;else if(event.key==='End')next=count-1;else return;event.preventDefault();setTime(part,next);event.currentTarget.parentElement.querySelector(`[data-time="${next}"]`)?.focus({preventScroll:true})}
 useEffect(()=>{if(open)for(const list of panel.current?.querySelectorAll('[data-time-list]')||[]){const active=list.querySelector('[aria-pressed=true]');if(active)list.scrollTop=active.offsetTop-(list.clientHeight-active.offsetHeight)/2}},[open,actual])
 const heading=month.toLocaleDateString('en-GB',{month:'long',year:'numeric'})
 return <div className={styles.dateField}>
  <label htmlFor={id}>{label}</label>
  <div className={styles.dateInput}>
   <input ref={input} id={id} type="text" required={required} placeholder="dd/mm/yyyy, hh:mm" value={text} onChange={e=>{const raw=e.target.value;setText(raw);const parsed=parse(raw);e.target.setCustomValidity(raw&&!parsed?'Enter a valid date and time: dd/mm/yyyy, hh:mm.':'');if(!raw||parsed)update(parsed)}} onKeyDown={e=>{if(e.key==='ArrowDown'&&e.altKey){e.preventDefault();show()}}}/>
   <button ref={trigger} type="button" aria-label={`Choose ${label.toLowerCase()}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-calendar`} onClick={()=>open?close():show()}><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/></svg></button>
  </div>
  {name&&<input type="hidden" name={name} value={actual || ''}/>}
  {open&&<div ref={panel} id={`${id}-calendar`} popover="auto" role="dialog" aria-label={`Choose ${label.toLowerCase()}`} className={styles.datePanel} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}}}>
   <div className={styles.calendarBody}><div>
   <div className={styles.calendarHeading}><strong id={`${id}-month`} aria-live="polite">{heading}</strong><button type="button" aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div>
   <div role="grid" aria-labelledby={`${id}-month`}>
    <div role="row" className={styles.calendarRow}>{['Mo','Tu','We','Th','Fr','Sa','Su'].map(day=><span role="columnheader" key={day}>{day}</span>)}</div>
    {Array.from({length:6},(_,week)=><div role="row" key={week} className={styles.calendarRow}>{days.slice(week*7,week*7+7).map(d=><button key={dayKey(d)} type="button" role="gridcell" data-day={dayKey(d)} data-outside={d.getMonth()!==month.getMonth()} tabIndex={dayKey(d)===active?0:-1} aria-selected={!!selected&&dayKey(d)===dayKey(selected)} aria-current={dayKey(d)===dayKey(new Date())?'date':undefined} aria-label={d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} onClick={()=>pick(d)} onKeyDown={e=>keyboard(e,d)}>{d.getDate()}</button>)}</div>)}
   </div>
   </div><div className={styles.calendarTime}>{[['hour','Hour',24,base.getHours()],['minute','Minute',60,base.getMinutes()]].map(([part,title,count,current])=><div key={part} className={styles.timeColumn}><span>{title}</span><div role="group" aria-label={`${label} ${part}`} data-time-list className={styles.timeList}>{Array.from({length:count},(_,n)=><button type="button" key={n} data-time={n} aria-label={`${label} ${part} ${pad(n)}`} aria-pressed={current===n} tabIndex={current===n?0:-1} onClick={()=>setTime(part,n)} onKeyDown={event=>timeKey(event,part,n,count)}>{pad(n)}</button>)}</div></div>)}</div></div>
   <div className={styles.calendarActions}><button type="button" onClick={()=>update(null)}>Clear</button><button type="button" onClick={()=>pick(new Date())}>Today</button><button type="button" onClick={close}>Done</button></div>
  </div>}
 </div>
}
