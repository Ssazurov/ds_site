// components/AssistantGate.tsx — при выключенном флаге уводит с «Помощника» на /news (ds_site#94).
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAssistantEnabled } from "@/lib/assistant-flag";

export default function AssistantGate({ children }: { children: React.ReactNode }) {
  const enabled = useAssistantEnabled();
  const router = useRouter();

  useEffect(() => {
    if (enabled === false) router.replace("/news");
  }, [enabled, router]);

  return enabled === true ? <>{children}</> : null;
}
