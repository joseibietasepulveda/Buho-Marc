import {DashboardClient} from '../dashboard/dashboard-client';
import '../analytics.css';
export const metadata={title:'Evaluaciones de cruces | Buho Marc',robots:{index:false,follow:false}};
export default function EvaluationsPage(){return <DashboardClient initialTab="evaluations"/>;}
