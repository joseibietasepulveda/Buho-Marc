import { z } from 'zod';
import {ANALYTICS_MODULES} from "./analytics-modules";
export const clientAnalyticsEvent=z.object({id:z.uuid(),module:z.enum(ANALYTICS_MODULES),eventName:z.enum(['interaction','module_viewed','digest_viewed','comparison_opened','search_submitted','report_downloaded']),sessionId:z.uuid(),occurredAt:z.iso.datetime(),properties:z.object({surface:z.enum(['button','link','select','form']).optional(),action:z.enum(['activate','change','submit','navigate','download']).optional(),digest_run_id:z.uuid().optional()}).strict().default({})}).strict();
export const clientAnalyticsBatch=z.object({events:z.array(clientAnalyticsEvent).min(1).max(50)}).strict();
export function analyticsCaptureEnabled(){return process.env.ADMIN_ANALYTICS_CAPTURE_ENABLED==='true';}
export function sanitizedAnalyticsProperties(properties:Record<string,unknown>={}){
 const values:Record<string,string|number|boolean|null>={};
 for(const [key,value] of Object.entries(properties)){
  if(['automated','cached','attempt','batch_size','http_request','observed','is_backfill'].includes(key) && (typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)))values[key]=value;
  if(['source','billing_source','surface','action','phase'].includes(key)&&typeof value==='string'&&/^[a-z_][a-z0-9_-]{0,40}$/.test(value))values[key]=value;
  if(['digest_run_id','entity_id'].includes(key)&&z.uuid().safeParse(value).success)values[key]=value as string;
 }
 return values;
}
