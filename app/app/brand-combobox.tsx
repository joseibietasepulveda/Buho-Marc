"use client";
import { useId, useState } from "react";
import { foldText } from "@/lib/text-search";

export function BrandCombobox({ name, label, inputId, options, value, onChange, disabled, required, placeholder = "Buscar o elegir una marca" }: {
  name: string; label: string; inputId?: string; options: { value: string; label: string }[]; value: string;
  onChange: (value: string) => void; disabled?: boolean; required?: boolean; placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const selected = options.find(option => option.value === value);
  const visible = options.filter(option => foldText(option.label).includes(foldText(query)));
  const index = Math.min(active, Math.max(0, visible.length - 1));
  function choose(next: string) { onChange(next); setOpen(false); setQuery(""); setActive(0); }
  return <div className="brand-combobox" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(""); } }}>
    <input type="hidden" name={name} value={value}/>
    <div className="brand-combobox-control"><input id={inputId} role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open && visible.length ? `${id}-${index}` : undefined} autoComplete="off" disabled={disabled} required={required} placeholder={placeholder} value={open ? query : selected?.label ?? ""} onFocus={() => { setOpen(true); setQuery(""); }} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(current => Math.max(0, Math.min(visible.length - 1, (open ? current + (event.key === "ArrowDown" ? 1 : -1) : 0)))); }
      if (event.key === "Enter" && open) { event.preventDefault(); if (visible[index]) choose(visible[index].value); }
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(""); }
    }}/><button type="button" aria-label={`Mostrar opciones de ${label}`} aria-expanded={open} disabled={disabled} onClick={() => { setOpen(current => !current); setQuery(""); setActive(0); }}>⌄</button></div>
    {open && <div className="brand-combobox-options" id={id} role="listbox" aria-label={label}>{visible.map((option, i) => <button type="button" tabIndex={-1} role="option" id={`${id}-${i}`} aria-selected={value === option.value} className={i === index ? "is-highlighted" : ""} key={option.value} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => choose(option.value)}>{option.label}</button>)}{!visible.length && <p role="status">No hay marcas con esa búsqueda.</p>}</div>}
  </div>;
}
