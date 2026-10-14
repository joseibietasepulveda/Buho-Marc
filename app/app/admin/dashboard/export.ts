import type { AdminDashboardReport } from '@/lib/admin-analytics';
import { downloadCsv } from './format';
import type { DashboardTab } from './views';
export function reportRows(report: AdminDashboardReport, tab: DashboardTab): unknown[][] {
  const { scope } = report;
  const rows: unknown[][] = [['Buho Marc · dashboard administrativo', tab], ['Desde', scope.from], ['Hasta', scope.to], ['Estudio', scope.organizationId ?? 'Todos'], ['Usuario', scope.userId ?? 'Todos'], ['Generado', report.generatedAt], ['Zona horaria', report.timezone], []];
  const sectionMetrics = tab === 'costs' ? report.costs.metrics : tab === 'activity' ? report.users.metrics : tab === 'portfolio' ? [...report.portfolio.metrics, ...report.alerts.metrics] : tab === 'tasks' ? [...report.tasks.metrics, ...report.deadlines.metrics] : tab === 'emails' ? report.emails.metrics : tab === 'apis' ? report.apis.metrics : report.behavior.metrics;
  rows.push(['Indicador', 'Valor', 'Unidad', 'Disponibilidad', 'Nota']);
  rows.push(...sectionMetrics.map(metric => [metric.label, metric.value, metric.unit, metric.availability, metric.note ?? '']));
  rows.push([]);
  if (tab === 'costs') {
    rows.push(['Proveedor', 'Operación', 'Modelo', 'Llamados', 'Confirmado US$', 'Estimado US$', 'Reservado US$', 'Costo desconocido', 'Tokens entrada', 'Tokens salida']);
    rows.push(...report.costs.providers.map(row => [row.provider, row.operation, row.model, row.calls, row.confirmedUsd, row.estimatedUsd, row.reservedUsd, row.unknownCostCalls, row.inputTokens, row.outputTokens]));
    rows.push([], ['Fecha', 'Confirmado US$', 'Estimado US$', 'Reservado US$']);
    rows.push(...report.costs.daily.map(row => [row.date, row.confirmedUsd, row.estimatedUsd, row.reservedUsd]));
    rows.push([], ['Estudio', 'Llamados', 'Costo atribuible US$']);
    rows.push(...report.costs.organizations.map(row => [row.label, row.count, row.value]));
    rows.push([], ['Usuario / atribución', 'Llamados', 'Costo atribuible US$']);
    rows.push(...report.costs.byUser.map(row => [row.label, row.count, row.value]));
    rows.push([], ['Proveedor', 'Descripción', 'Tipo', 'Monto US$', 'Estudio', 'Operación', 'Desde', 'Hasta']);
    rows.push(...report.costs.rules.map(row => [row.provider, row.label, row.kind, row.amountUsd, row.organizationId, row.operation, row.effectiveFrom, row.effectiveTo]));
  } else if (tab === 'activity') {
    rows.push(['Usuario', 'Estudio', 'Rol', 'Interacciones', 'Sesiones', 'Última actividad', 'Nunca ingresó', 'Marcas incorporadas', 'Marcas a cargo', 'Tareas creadas', 'Asignadas', 'Completadas', 'Vencidas', 'Revisiones', 'Casos', 'Cumplimiento %']);
    rows.push(...report.users.rows.map(row => [row.name, row.organization, row.role, row.interactions, row.sessions, row.lastActivity, row.neverLoggedIn, row.brandsCreated, row.brandsResponsible, row.tasksCreated, row.tasksAssigned, row.tasksCompleted, row.tasksOverdue, row.reviews, row.casesCreated, row.onTimePercent]));
    rows.push([], ['Semana', 'Usuario', 'Interacciones']);
    rows.push(...report.users.weekly.map(row => [row.date, row.label ?? row.userId, row.count]));
    rows.push([], ['Día', 'Usuario', 'Interacciones']);
    rows.push(...report.users.daily.map(row => [row.date, row.label ?? row.userId, row.count]));
  } else if (tab === 'portfolio') {
    rows.push(['Usuario', 'Estudio', 'Marcas incorporadas', 'Marcas a cargo', 'Revisiones', 'Casos']);
    rows.push(...report.portfolio.byUser.map(row => [row.name, row.organization, row.brandsCreated, row.brandsResponsible, row.reviews, row.casesCreated]));
    rows.push([], ['Total de marcas del alcance', report.portfolio.totalBrands], ['Límite del detalle de marcas', report.portfolio.detailLimit], ['Marca', 'Estudio', 'Incorporada por', 'Responsable', 'Vigilancia activa']);
    rows.push(...report.portfolio.assignments.map(row => [row.brandName, row.organizationId, row.createdBy, row.responsibleUserId, row.watching]));
    rows.push([], ['Resultado', 'Cantidad']); rows.push(...report.alerts.outcomes.map(row => [row.label, row.count]));
  } else if (tab === 'tasks') {
    rows.push(['Usuario', 'Estudio', 'Creadas', 'Asignadas', 'Completadas', 'Vencidas', 'Cumplimiento %']);
    rows.push(...report.tasks.byUser.map(row => [row.name, row.organization, row.tasksCreated, row.tasksAssigned, row.tasksCompleted, row.tasksOverdue, row.onTimePercent]));
    rows.push([], ['Fecha', 'Estudio', 'Tipo', 'Estado', 'Con responsable', 'Con tarea']);
    rows.push(...report.deadlines.rows.map(row => [row.date, row.organizationId, row.type, row.status, row.hasResponsible, row.hasTask]));
  } else if (tab === 'emails') {
    rows.push(['Fecha', 'Estudio', 'Estado', 'Alertas', 'Tareas', 'Entregado', 'Rebotado', 'Clics', 'Accesos identificados', 'Gestiones posteriores']);
    rows.push(...report.emails.rows.map(row => [row.at, row.organizationId, row.status, row.alerts, row.tasks, row.delivered, row.bounced, row.clicks, row.identifiedViews, row.actionsAfterEmail]));
  } else if (tab === 'apis') {
    rows.push(['Total del período', report.apis.totalCalls], ['Límite de detalle reciente', report.apis.detailLimit], ['El detalle siguiente puede ser una muestra reciente; los agregados anteriores incluyen el período completo.'], []);
    rows.push(['Proveedor', 'Operación', 'Modelo', 'Llamados', 'Errores', 'Sin resultado', 'Media ms', 'P95 ms', 'Confirmado US$', 'Estimado US$', 'Reservado US$']);
    rows.push(...report.apis.providers.map(row => [row.provider, row.operation, row.model, row.calls, row.errors, row.unknownOutcome, row.meanDurationMs, row.p95DurationMs, row.confirmedUsd, row.estimatedUsd, row.reservedUsd]));
    rows.push([], ['Fecha', 'Proveedor', 'Operación', 'Modelo', 'Estudio', 'Usuario', 'Resultado', 'HTTP', 'Duración ms', 'Confirmado US$', 'Estimado US$', 'Reservado US$', 'Tokens entrada', 'Tokens salida', 'Procedencia']);
    rows.push(...report.apis.calls.map(row => [row.startedAt, row.provider, row.operation, row.model, row.organizationId, row.userId, row.outcome, row.statusCode, row.durationMs, row.confirmedUsd, row.estimatedUsd, row.reservedUsd, row.inputTokens, row.outputTokens, row.source]));
  } else {
    rows.push(['Módulo', 'Interacciones']); rows.push(...report.behavior.modules.map(row => [row.label, row.count]));
    rows.push([], ['Acción', 'Cantidad']); rows.push(...report.behavior.actions.map(row => [row.label, row.count]));
    rows.push([], ['Etapa', 'Cantidad']); rows.push(...report.behavior.funnel.map(row => [row.label, row.count]));
  }
  rows.push([], ['Limitaciones y cobertura'], ...report.limitations.map(note => [note]));
  return rows;
}
export function exportReport(report: AdminDashboardReport, tab: DashboardTab) {
  downloadCsv(`buho-${tab}-${report.scope.from}-${report.scope.to}.csv`, reportRows(report, tab));
}
