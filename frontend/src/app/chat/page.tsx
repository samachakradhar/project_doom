import { AuthGuard } from '@/components/AuthGuard';
import ChatbotWorkspace from '@/components/ChatbotWorkspace';

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatbotWorkspace />
    </AuthGuard>
  );
}
