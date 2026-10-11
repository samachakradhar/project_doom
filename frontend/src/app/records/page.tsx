import { AuthGuard } from '@/components/AuthGuard';
import MedicalRecordsDashboard from '@/components/MedicalRecordsDashboard';

export default function RecordsPage() {
  return (
    <AuthGuard>
      <MedicalRecordsDashboard />
    </AuthGuard>
  );
}
