// app/assistant/page.tsx — публичный пункт меню "Помощник" (issue #17,
// эпик #14). Та же реализация, что и главная, вынесена в
// components/ChatAssistant.tsx. При выключенном флаге — редирект на /news (ds_site#94).
import AssistantGate from "@/components/AssistantGate";
import ChatAssistant from "@/components/ChatAssistant";

export default function AssistantPage() {
  return (
    <AssistantGate>
      <ChatAssistant />
    </AssistantGate>
  );
}
