'use client';
import { useEffect, useState } from 'react';
import type { AdminDashboardReport, AdminDashboardResponse, AnalyticsScope } from '@/lib/admin-analytics';
import { date, dateRange, number } from './format';
import { exportReport } from './export';
import { DashboardView, TABS, type DashboardTab } from './views';
import { Icon, Pill } from './visuals';

function queryFor(scope: AnalyticsScope) {
  const query = new URLSearchParams({ from: scope.from, to: scope.to });
  if (scope.organizationId) query.set('organizationId', scope.organizationId);
  if (scope.userId) query.set('userId', scope.userId);
  return query;
}
function preceding(scope: AnalyticsScope): AnalyticsScope {
  const from = new Date(`${scope.from}T12:00:00Z`), to = new Date(`${scope.to}T12:00:00Z`);
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  to.setTime(from.getTime() - 86400000); from.setUTCDate(from.getUTCDate() - days);
  return { ...scope, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
export function DashboardClient({initialTab='costs'}:{initialTab?:DashboardTab}) {
  const [scope, setScope] = useState<AnalyticsScope>(() => ({ ...dateRange(56), organizationId: null, userId: null }));
  const [form, setForm] = useState(scope), [tab, setTab] = useState<DashboardTab>(initialTab), [compare, setCompare] = useState(false);
  const [data, setData] = useState<AdminDashboardResponse | null>(null), [previous, setPrevious] = useState<AdminDashboardReport | undefined>();
  const [error, setError] = useState(''), [denied, setDenied] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0), [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined; const until = Date.now() + 180000;
    async function read(requestScope: AnalyticsScope) {
      const response = await fetch(`/api/admin/dashboard?${queryFor(requestScope)}`, { signal: controller.signal, cache: 'no-store' });
      if (response.status === 401) { window.location.assign('/admin/login?next=%2Fapp%2Fadmin%2Fdashboard'); throw new Error('Inicia sesión con una cuenta administradora.'); }
      if (response.status === 403) { setDenied(true); throw new Error('Esta cuenta no tiene acceso al dashboard administrativo.'); }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'No se pudo cargar el dashboard.');
      return payload as AdminDashboardResponse;
    }
    async function load() {
      try {
        const [current, older] = await Promise.all([read(scope), compare ? read(preceding(scope)) : Promise.resolve(null)]);
        if (controller.signal.aborted) return;
        setData(current); setPrevious(older?.report ?? undefined); setError(''); setLoading(false);
        const pending = [current, older].some(item => item && ['queued', 'running'].includes(item.snapshot.status));
        if (pending && Date.now() < until) timer = setTimeout(() => void load(), 5000);
        else if (pending) setMessage('El resumen sigue preparándose en segundo plano. Puedes actualizarlo en unos minutos.');
      } catch (reason) {
        if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar.'); setLoading(false); }
      }
    }
    const initial = setTimeout(() => { setLoading(true); setData(null); setPrevious(undefined); void load(); }, 0);
    return () => { controller.abort(); clearTimeout(initial); if (timer) clearTimeout(timer); };
  }, [scope, compare, revision]);
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.from || !form.to || form.from > form.to) { setError('Selecciona un rango de fechas válido.'); return; }
    const days = (new Date(form.to).getTime() - new Date(form.from).getTime()) / 86400000;
    if (days > 365) { setError('El rango máximo por consulta es de 366 días.'); return; }
    setScope({ ...form }); setError('');
  }
  async function mutate(body: Record<string, unknown>) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'No se pudo guardar el cambio.');
      setMessage(body.action === 'refresh' ? 'Actualización solicitada. El procesamiento ocurre en segundo plano.' : 'Cambio guardado. Se actualizarán las cifras en segundo plano.');
      setRevision(value => value + 1);
    } catch (reason) { const text = reason instanceof Error ? reason.message : 'No se pudo guardar el cambio.'; setError(text); throw new Error(text); }
    finally { setBusy(false); }
  }
  const active = TABS.find(item => item.id === tab)!;
  const selectedUsers = data?.users.filter(user => !form.organizationId || user.organizationId === form.organizationId) ?? [];
  const report = data?.report;
  const pending = data?.snapshot.status === 'queued' || data?.snapshot.status === 'running';
  const previousScope = preceding(scope);
  if (denied) return <main className="admin-analytics ad-access"><Icon name="shield" size={40} /><h1>Acceso administrativo</h1><p>{error}</p><a className="ad-button ad-button-primary" href="/app">Volver a mi espacio</a><a className="ad-text-link" href="/admin/login">Ingresar con otra cuenta</a></main>;
  return <main className="admin-analytics"><a className="ad-skip" href="#dashboard-content">Ir al contenido del dashboard</a>
    <aside className="ad-sidebar"><a className="ad-wordmark" href="/app"><span>B</span><div>Búho Marc<small>ADMINISTRACIÓN</small></div></a><div className="ad-workspace-name"><Icon name="shield" size={18} /><span>Panel de control<small>Uso, resultados y costos</small></span></div><nav aria-label="Secciones del dashboard">{TABS.map(item => <button key={item.id} className={item.id === tab ? 'is-active' : ''} aria-current={item.id === tab ? 'page' : undefined} onClick={() => { setTab(item.id); setMessage(''); }}><Icon name={item.icon} />{item.label}{item.id === 'costs' && <span className="ad-nav-label">US$</span>}</button>)}</nav><div className="ad-sidebar-bottom"><p><span className="ad-live-dot" />Datos guardados</p><small>Consultar este dashboard no llama a los proveedores.</small><a href="/app"><Icon name="arrow" size={16} />Volver a la plataforma</a></div></aside>
    <div className="ad-main"><header className="ad-page-header"><div><span className="ad-eyebrow">VISIBILIDAD PARA DECIDIR</span><h1>Actividad y costos</h1><p>Entiende el uso de Búho Marc y el costo de cada proceso.</p></div><div className="ad-header-actions"><Pill tone="purple"><Icon name="shield" size={14} />Administrador</Pill><button className="ad-button" disabled={busy || loading || pending} onClick={() => void mutate({ action: 'refresh', ...scope }).catch(() => {})}><Icon name="refresh" />Actualizar</button><button className="ad-button ad-button-primary" disabled={!report} onClick={() => report && exportReport(report, tab)}><Icon name="download" />{tab==='evaluations'?'Exportar resumen':'Exportar CSV'}</button></div></header>
      <form className="ad-filters" onSubmit={apply}><div className="ad-filter-presets" aria-label="Rangos rápidos">{[{ label: '7 días', days: 7 }, { label: '30 días', days: 30 }, { label: '8 semanas', days: 56 }, { label: '90 días', days: 90 }].map(preset => <button type="button" key={preset.days} className={form.from === dateRange(preset.days).from && form.to === dateRange(preset.days).to ? 'is-active' : ''} onClick={() => { const range = dateRange(preset.days); const next = { ...form, ...range }; setForm(next); setScope(next); }}>{preset.label}</button>)}</div><div className="ad-filter-fields"><label>Desde<input type="date" value={form.from} max={form.to} onChange={event => setForm({ ...form, from: event.target.value })} required /></label><label>Hasta<input type="date" value={form.to} min={form.from} onChange={event => setForm({ ...form, to: event.target.value })} required /></label><label>Estudio<select aria-label="Estudio" value={form.organizationId ?? ''} onChange={event => setForm({ ...form, organizationId: event.target.value || null, userId: null })}><option value="">Todos los estudios</option>{data?.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Usuario<select aria-label="Usuario" value={form.userId ?? ''} onChange={event => setForm({ ...form, userId: event.target.value || null })}><option value="">Todos los usuarios</option>{selectedUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button className="ad-button ad-filter-apply" type="submit">Aplicar filtros</button></div><label className="ad-compare"><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} />Comparar con el período anterior de igual duración</label></form>
      <div className="ad-status-line"><div><span className={`ad-status-dot ${pending || loading ? 'is-pending' : ''}`} />{loading ? 'Cargando datos…' : pending ? 'Preparando resumen en segundo plano…' : data?.snapshot.status === 'failed' ? 'No se pudo preparar el resumen' : `Resumen ${data?.snapshot.stale ? 'anterior' : 'actualizado'} · ${date(data?.snapshot.generatedAt, true)}`}</div><span>Hora de Chile · {date(scope.from)} — {date(scope.to)}</span></div>
      {error && <div className="ad-alert ad-alert-error" role="alert"><Icon name="info" /><p>{error}</p><button className="ad-inline-button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>}{message && <p className="ad-alert ad-alert-success" role="status">{message}</p>}{data?.snapshot.error && !error && <p className="ad-alert ad-alert-error" role="alert">{data.snapshot.error}</p>}
      <div className="ad-section-heading"><div><span className="ad-section-icon"><Icon name={active.icon} size={24} /></span><div><h2>{active.label}</h2><p>{active.description}</p></div></div>{report && <span className="ad-period-chip">{number(data?.organizations.length)} estudios disponibles</span>}</div>
      {compare && <p className="ad-compare-period">Comparación: {date(previousScope.from)} — {date(previousScope.to)}{!previous && ' · preparando período anterior'}. Los datos de cartera y pendientes describen el estado actual; no reconstruyen fotografías históricas.</p>}
      <div id="dashboard-content" tabIndex={-1} aria-busy={loading || pending}>{report ? <DashboardView allEvaluationHistory={initialTab==='evaluations'} tab={tab} key={`${tab}:${scope.from}:${scope.to}:${scope.organizationId}:${scope.userId}`} report={report} previous={previous} data={data!} onSave={mutate} onDelete={id => mutate({ action: 'delete_cost_rule', id }).catch(() => {})} busy={busy} /> : loading || pending ? <div className="ad-loading"><div className="ad-skeleton-grid">{[1, 2, 3, 4].map(item => <div className="ad-skeleton" key={item} />)}</div><section><Icon name="clock" size={28} /><h2>Preparando tus indicadores</h2><p>Las agregaciones se calculan en segundo plano para proteger los procesos de la plataforma.</p></section></div> : <div className="ad-loading"><h2>Aún no hay un resumen disponible</h2><p>Solicita una actualización para preparar los datos guardados.</p><button className="ad-button" onClick={() => void mutate({ action: 'refresh', ...scope }).catch(() => {})}>Preparar resumen</button></div>}</div>
      {report && <details className="ad-limitations"><summary><Icon name="info" size={17} />Cobertura, procedencia y límites de estas cifras</summary><p>Actividad detallada disponible desde {date(data?.telemetrySince, true)}. Los antecedentes existentes se agregan cuando permiten atribuir una acción a un usuario.</p><ul>{report.limitations.map((note, index) => <li key={index}>{note}</li>)}</ul><p>Exportar descarga la sección activa y sus agregados. En APIs, el detalle reciente conserva el límite indicado. Los valores ausentes se mantienen vacíos.</p></details>}
      <footer className="ad-footer"><span>Búho Marc · Administración</span><span>Sin consultas externas al abrir el dashboard</span></footer>
    </div></main>;
}
