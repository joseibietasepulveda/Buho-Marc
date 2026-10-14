'use client';
import {useEffect} from 'react';
import {ANALYTICS_MODULES} from '@/lib/analytics-modules';
export function AnalyticsObserver({enabled}:{enabled:boolean}){
 useEffect(()=>{
  if(!enabled)return;
  type Captured={id:string;module:string;eventName:string;sessionId:string;occurredAt:string;properties:Record<string,string>};
  const queue:Captured[]=[];let stopped=false,lastView='';
  let sessionId:string;try{sessionId=sessionStorage.getItem('buho-analytics-session')||crypto.randomUUID();sessionStorage.setItem('buho-analytics-session',sessionId);}catch{sessionId=crypto.randomUUID();}
  const currentModule=()=>location.pathname.startsWith('/app/admin')?'admin':location.pathname.startsWith('/app/resumen-semanal')?'summary':(ANALYTICS_MODULES as readonly string[]).includes(location.hash.slice(1).split('?')[0])?location.hash.slice(1).split('?')[0]:'dashboard';
  const emit=(eventName:string,properties:Record<string,string>={})=>{if(queue.length>=100||document.visibilityState==='hidden'&&eventName==='interaction')return;queue.push({id:crypto.randomUUID(),module:currentModule(),eventName,sessionId,occurredAt:new Date().toISOString(),properties});};
  const flush=()=>{if(stopped||!queue.length)return;const events=queue.splice(0,50);void fetch('/api/analytics/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events}),keepalive:true}).then(r=>{if(r.status===401||r.status===403)stopped=true;}).catch(()=>{});};
  const view=()=>{const current=currentModule();if(current===lastView)return;lastView=current;emit('module_viewed');};
  const click=(event:MouseEvent)=>{const target=event.target instanceof Element?event.target.closest('button,a'):null;if(!target||target.closest('[data-no-analytics],.session-page'))return;emit('interaction',{surface:target.tagName==='A'?'link':'button',action:'activate'});requestAnimationFrame(view);};
  const change=(event:Event)=>{if(event.target instanceof HTMLSelectElement)emit('interaction',{surface:'select',action:'change'});};
  const submit=(event:SubmitEvent)=>{if(event.target instanceof HTMLFormElement&&!event.target.querySelector('input[type=password]')){emit('interaction',{surface:'form',action:'submit'});if(event.target.querySelector('input[type=search]')||event.target.dataset.analytics==='search')emit('search_submitted');}};
  const visibility=()=>{if(document.visibilityState==='hidden')flush();else view();};
  view();document.addEventListener('click',click,{passive:true});document.addEventListener('change',change,{passive:true});document.addEventListener('submit',submit,{passive:true});document.addEventListener('visibilitychange',visibility);window.addEventListener('hashchange',view);window.addEventListener('pagehide',flush);const timer=setInterval(flush,15000);
  return ()=>{flush();clearInterval(timer);document.removeEventListener('click',click);document.removeEventListener('change',change);document.removeEventListener('submit',submit);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('hashchange',view);window.removeEventListener('pagehide',flush);};
 },[enabled]);return null;
}
