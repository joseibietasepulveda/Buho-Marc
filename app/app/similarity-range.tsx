"use client";
import type { WatchSettings } from '@/lib/watch-policy';
export function SimilarityRange({value,onChange}:{value:WatchSettings;onChange:(value:WatchSettings)=>void}) {
  const high=Math.round(value.high*100), medium=Math.round(value.medium*100);
  return <fieldset className="similarity-range"><legend>Rangos de similitud</legend>
    <div className="similarity-range-track" style={{background:`linear-gradient(to right,#bd3b53 0%,#bd3b53 ${100-high}%,#d9a12e ${100-high}%,#d9a12e ${100-medium}%,#3d8b69 ${100-medium}%,#3d8b69 100%)`}}>
      <input aria-label="Límite de alta similitud" aria-valuetext={`${high}%`} type="range" min={0} max={100} step={5} value={100-high} onChange={e=>onChange({...value,high:Math.max(medium+5,100-Number(e.target.value))/100})}/>
      <input aria-label="Límite de media similitud" aria-valuetext={`${medium}%`} type="range" min={0} max={100} step={5} value={100-medium} onChange={e=>onChange({...value,medium:Math.min(high-5,100-Number(e.target.value))/100})}/>
    </div><div className="similarity-range-scale"><span>100%</span><span>0%</span></div>
    <div className="similarity-range-legend"><span className="is-high"><i/>Alta similitud <strong>{high}%–100%</strong></span><span className="is-medium"><i/>Media similitud <strong>{medium}%–menos de {high}%</strong></span><span className="is-low"><i/>Baja similitud <strong>Menos de {medium}%</strong></span></div>
    <p>100% es el máximo índice de similitud. El índice no acredita que dos marcas sean idénticas.</p>
  </fieldset>;
}
