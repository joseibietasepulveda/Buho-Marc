import type { Metadata } from 'next';
import { DashboardClient } from './dashboard-client';
import '../analytics.css';
export const metadata: Metadata = { title: 'Búho Marc | Actividad y costos', robots: { index: false, follow: false } };
export default function AdminDashboardPage() { return <DashboardClient />; }
