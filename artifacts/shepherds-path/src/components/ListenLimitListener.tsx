import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LISTEN_LIMIT_COPY, type ListenLimitMessageKey } from "@/lib/listenPolicy";
import type { ListenLimitCode } from "@/hooks/use-tts";

function messageForCode(code: ListenLimitCode): string {
  if (code in LISTEN_LIMIT_COPY) {
    return LISTEN_LIMIT_COPY[code as ListenLimitMessageKey];
  }
  return "Audio isn't available right now. Try again in a moment.";
}

/** Surfaces TTS limit errors app-wide (Journey, Bible, Guidance, Devotional). */
export function ListenLimitListener() {
  const { toast } = useToast();

  useEffect(() => {
    const onLimit = (e: Event) => {
      const code = (e as CustomEvent<{ code?: ListenLimitCode }>).detail?.code;
      if (!code) return;
      toast({
        title: "Listen",
        description: messageForCode(code),
        variant: code === "pro_required" || code === "devotional_chain_limit" ? "default" : "destructive",
      });
    };
    window.addEventListener("sp-listen-limit", onLimit);
    return () => window.removeEventListener("sp-listen-limit", onLimit);
  }, [toast]);

  return null;
}
