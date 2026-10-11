import { AuthGuard } from '@/components/AuthGuard';
import ChatbotWorkspace from '@/components/ChatbotWorkspace';

export default function CopilotPage() {
  return (
    <AuthGuard>
      <ChatbotWorkspace />
    </AuthGuard>
  );
}
