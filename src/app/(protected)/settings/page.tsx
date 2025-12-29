'use client';

import { SettingsPage } from '@/components/SettingsPage';
import { useRouter } from 'next/navigation';

export default function SettingsRoute() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <SettingsPage isOpen={true} onClose={() => router.push('/app')} />
    </div>
  );
}
