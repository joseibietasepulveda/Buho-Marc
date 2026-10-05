"use client";
import { Fragment } from 'react';
import { SimilarityImage } from './similarity-results';

export type ComparisonSide={label:string;name:string;image:string;rows:{label:string;value?:string|null}[]};

/** Shared by Vigilancia and Factibilidad, including logo enlargement and coverage disclosure. */
export function TrademarkComparison({left,right}:{left:ComparisonSide;right:ComparisonSide}){
 return <div className="buho-side-by-side">{[left,right].map((side,index)=><Fragment key={index}>
  {index===1&&<i aria-hidden>↔</i>}
  <article><span>{side.label}</span><div className={`buho-mark-card ${index?'is-found':''}`}><SimilarityImage key={side.image} src={side.image} name={side.name}/></div>
   <dl>{side.rows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.label==='Cobertura'?<details><summary>Ver cobertura</summary><p>{row.value||'No informada'}</p></details>:row.value||'No informado'}</dd></div>)}</dl>
  </article>
 </Fragment>)}</div>;
}
