import type { Metadata } from 'next';
import { currentAdmin, needsFirstUser, setupKeyProblem } from '@/lib/server/auth';
import { isDbConfigured } from '@/lib/server/db';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSetup from '@/components/admin/AdminSetup';
import AdminApp from '@/components/admin/AdminApp';
import SetupRequired from '@/components/SetupRequired';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | Rajeshwar Pooja Samagri',
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  if (!isDbConfigured()) return <SetupRequired reason="DATABASE_URL is not set." />;
  let firstRun = false;
  try {
    firstRun = await needsFirstUser();
  } catch {
    return <SetupRequired reason="The database could not be reached or has not been migrated. Run `npm run db:migrate`." />;
  }
  if (firstRun) return <AdminSetup configProblem={setupKeyProblem()} />;
  const user = await currentAdmin();
  if (!user) return <AdminLogin />;
  return <AdminApp />;
}
