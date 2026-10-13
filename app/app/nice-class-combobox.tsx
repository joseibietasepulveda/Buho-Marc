"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { foldText } from "@/lib/text-search";

export function NiceClassCombobox({value,onChange,unavailable=[]}:{value:string;onChange:(value:string)=>void;unavailable?:number[]}) {
  const id=useId(), list=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
  const selected=NICE_CLASSES.find(item=>String(item.number)===value);
  const needle=foldText(query.trim());
  const visible=NICE_CLASSES.filter(item=>/^\d+$/.test(needle)?String(item.number).startsWith(needle):foldText(`${item.number} ${item.meaning}`).includes(needle));
  const index=Math.min(active,Math.max(0,visible.length-1));
  useEffect(()=>{if(open)list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({block:'nearest'});},[open,index]);
  function choose(number:number){if(unavailable.includes(number))return;onChange(String(number));setOpen(false);setQuery('');setActive(0);}
  return <div className="brand-combobox nice-class-combobox" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setQuery('');}}}>
    <div className="brand-combobox-control"><input id="proposal-class" role="combobox" aria-label="Clase Niza" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open&&visible.length?`${id}-${index}`:undefined} autoComplete="off" placeholder="Buscar una clase por número o significado…" value={open?query:selected?`${selected.number} · ${selected.meaning}`:''} onFocus={()=>{setOpen(true);setQuery('');setActive(0);}} onClick={()=>{if(!open){setOpen(true);setQuery('');setActive(0);}}} onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(0);}} onKeyDown={event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActive(current=>Math.max(0,Math.min(visible.length-1,open?current+(event.key==='ArrowDown'?1:-1):0)));}
      if(event.key==='Enter'&&open){event.preventDefault();if(visible[index])choose(visible[index].number);}
      if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);setQuery('');}
    }}/><button type="button" aria-label="Mostrar clases de Niza" aria-expanded={open} onClick={()=>{setOpen(current=>!current);setQuery('');setActive(0);}}><CaretDown size={18} aria-hidden="true"/></button></div>
    {open&&<div ref={list} id={id} role="listbox" aria-label="Clases de Niza" className="brand-combobox-options">{visible.map((item,i)=><button type="button" role="option" tabIndex={-1} data-index={i} id={`${id}-${i}`} key={item.number} aria-selected={value===String(item.number)} aria-disabled={unavailable.includes(item.number)} className={i===index?'is-highlighted':''} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActive(i)} onClick={()=>choose(item.number)}>{item.number} · {item.meaning}{unavailable.includes(item.number)?' · Ya analizada':''}</button>)}{!visible.length&&<p role="status">No hay clases con esa búsqueda.</p>}</div>}
  </div>;
}
