// app/page.tsx — главная = чат-помощник (issue #17 вынес общую логику
// в components/ChatAssistant.tsx, доступен также по /assistant).
// При выключенном флаге «Помощник» — редирект на /news (ds_site#94).
import AssistantGate from "@/components/AssistantGate";
import ChatAssistant from "@/components/ChatAssistant";

export default function HomePage() {
  return (
    <AssistantGate>
      <ChatAssistant />
    </AssistantGate>
  );
}
