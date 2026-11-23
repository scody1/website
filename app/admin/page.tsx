import type { Metadata } from 'next';
import { currentAdmin, needsFirstUser, setupKeyProblem } from '@/lib/server/auth';
import { isDbConfigured } from '@/lib/server/db';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSetup from '@/components/admin/AdminSetup';
import AdminApp from '@/components/admin/AdminApp';
import SetupRequired, { databaseReady } from '@/components/SetupRequired';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | Rajeshwar Pooja Samagri',
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  if (!isDbConfigured() || !(await databaseReady())) return <SetupRequired />;
  let firstRun = false;
  try {
    firstRun = await needsFirstUser();
  } catch {
    return <SetupRequired />;
  }
  if (firstRun) return <AdminSetup configProblem={setupKeyProblem()} />;
  const user = await currentAdmin();
  if (!user) return <AdminLogin />;
  return <AdminApp />;
}
