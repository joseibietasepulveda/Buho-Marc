'use client';
import { useState, type ReactNode } from 'react';
import { number, shortDate, usd } from './format';

export function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    costs: 'M12 3v18m5-14H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    portfolio: 'M4 7h16v14H4zM8 7V3h8v4m-12 6h16',
    tasks: 'M8 5h13M8 12h13M8 19h13M2 5l1 1 2-2M2 12l1 1 2-2M2 19l1 1 2-2',
    mail: 'M3 5h18v14H3zM3 5l9 7 9-7',
    api: 'M8 4L2 12l6 8m8-16 6 8-6 8M14 3l-4 18',
    behavior: 'M5 4h14l-5 7v7l-4 3V11z',
    refresh: 'M20 11a8 8 0 1 0-2 6M20 4v7h-7',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    arrow: 'M19 12H5m6-6-6 6 6 6',
    info: 'M12 8v1m0 3v5M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0',
    shield: 'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 3a4 4 0 0 1 0 8M13 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0',
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.info} /></svg>;
}
export function Panel({ title, subtitle, children, action, className = '' }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`ad-panel ${className}`}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}
export function Metric({ title, value, detail, tone = 'purple', previous, hint }: { title: string; value: ReactNode; detail?: ReactNode; tone?: string; previous?: ReactNode; hint?: string }) {
  return <article className={`ad-metric ad-tone-${tone}`}><div className="ad-metric-label">{title}{hint && <span className="ad-hint" title={hint}><Icon name="info" size={14} /><span className="ad-sr">{hint}</span></span>}</div><strong>{value}</strong>{detail && <p>{detail}</p>}{previous && <small>{previous}</small>}</article>;
}
export function Empty({ children = 'Aún no hay registros para estos filtros.' }: { children?: ReactNode }) {
  return <div className="ad-empty"><Icon name="activity" size={29} /><p>{children}</p></div>;
}
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`ad-pill ad-pill-${tone}`}>{children}</span>;
}
export function Table({ columns, rows, caption, initialLimit = 15 }: { columns: string[]; rows: ReactNode[][]; caption?: string; initialLimit?: number }) {
  const [all, setAll] = useState(false);
  if (!rows.length) return <Empty />;
  const visible = all ? rows : rows.slice(0, initialLimit);
  return <><div className="ad-table-scroll"><table>{caption && <caption className="ad-sr">{caption}</caption>}<thead><tr>{columns.map((column, index) => <th key={`${column}-${index}`} scope="col">{column}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>{rows.length > initialLimit && <button className="ad-show-more" onClick={() => setAll(!all)}>{all ? 'Mostrar menos' : `Ver las ${number(rows.length)} filas`}</button>}</>;
}
export type BarItem = { label: string; value: number; detail?: string; color?: string; secondary?: string };
export function Ranking({ items, money = false }: { items: BarItem[]; money?: boolean }) {
  const max = Math.max(1, ...items.map(item => item.value));
  const ordered = [...items].sort((a, b) => b.value - a.value);
  return ordered.length ? <div className="ad-ranking">{ordered.map((item, index) => <div className="ad-rank" key={`${item.label}-${index}`}><div><span>{item.label}</span><strong>{money ? usd(item.value) : number(item.value)}</strong></div><div className="ad-rank-track"><span style={{ width: `${item.value / max * 100}%`, background: item.color ?? 'var(--ad-purple)' }} /></div>{(item.detail || item.secondary) && <small>{item.detail ?? item.secondary}</small>}</div>)}</div> : <Empty />;
}
export type ChartPoint = { date: string; values: number[] };
export function Bars({ points, series, money = false, label }: { points: ChartPoint[]; series: { label: string; color: string }[]; money?: boolean; label: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1e-6, ...points.map(point => point.values.reduce((a, b) => a + b, 0)));
  const maxTicks = 8;
  if (!points.length || points.every(point => point.values.every(value => !value))) return <Empty>{money ? 'No hay importes disponibles para graficar en este período.' : 'No hay actividad registrada en este período.'}</Empty>;
  return <div className="ad-bars"><div className="ad-chart-legend">{series.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div><div className="ad-chart-inner"><div className="ad-y-axis"><span>{money ? usd(max) : number(max)}</span><span>{money ? usd(max / 2) : number(max / 2)}</span><span>0</span></div><div className="ad-bar-columns" style={{gap: points.length > 80 ? 0 : points.length > 40 ? 1 : undefined}} role="group" aria-label={label}>{points.map((point, index) => <div key={point.date} className="ad-bar-slot"><button type="button" className="ad-bar-stack" onClick={() => setSelected(`${shortDate(point.date)} · ${series.map((item, i) => `${item.label}: ${money ? usd(point.values[i] ?? 0) : number(point.values[i] ?? 0)}`).join(' · ')}`)} aria-label={`${shortDate(point.date)}. ${series.map((item, i) => `${item.label}: ${money ? usd(point.values[i] ?? 0) : number(point.values[i] ?? 0)}`).join('. ')}`} title={`${shortDate(point.date)} · ${series.map((item, i) => `${item.label}: ${money ? usd(point.values[i] ?? 0) : number(point.values[i] ?? 0)}`).join(' · ')}`}>{point.values.map((value, i) => <span key={i} style={{ height: `${value / max * 100}%`, background: series[i]?.color ?? 'var(--ad-purple)' }} />)}</button><small>{index % Math.max(1, Math.ceil(points.length / maxTicks)) === 0 || index === points.length - 1 ? shortDate(point.date) : ''}</small></div>)}</div></div>{selected && <p className="ad-selection" role="status">{selected}</p>}<details className="ad-chart-data"><summary>Ver datos del gráfico</summary><Table columns={['Fecha', ...series.map(item => item.label)]} rows={points.map(point => [shortDate(point.date), ...point.values.map(value => money ? usd(value) : number(value))])} /></details></div>;
}
