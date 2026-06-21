import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type GenerateRequestInput, type GenerateResponseResult, type VerseResponse, type ChatRequest } from "@shared/routes";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { stripWrappingQuotes } from "@/lib/verseText";

function getEasternDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function sanitizeDailyVerse(verse: VerseResponse): VerseResponse {
  return {
    ...verse,
    text: stripWrappingQuotes(verse.text),
    encouragement: verse.encouragement ? stripWrappingQuotes(verse.encouragement) : verse.encouragement,
    reflectionPrompt: verse.reflectionPrompt ? stripWrappingQuotes(verse.reflectionPrompt) : verse.reflectionPrompt,
  };
}

function parseWithLogging<T>(schema: { parse: (data: unknown) => T }, data: unknown, label: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error(`[Zod] ${label} validation failed:`, error);
    throw error;
  }
}

export function useDailyVerse() {
  const easternDate = getEasternDateKey();
  return useQuery({
    queryKey: [api.verses.getDaily.path, easternDate],
    queryFn: async () => {
      const res = await fetch(`${api.verses.getDaily.path}?date=${easternDate}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch daily verse");
      }
      const data = await res.json();
      const verse = parseWithLogging(api.verses.getDaily.responses[200], data, "verses.getDaily");
      return sanitizeDailyVerse(verse);
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useGenerateAI() {
  return useMutation({
    mutationFn: async (input: GenerateRequestInput & { userName?: string }) => {
      const { userName, ...rest } = input;
      const validatedInput = api.ai.generate.input.parse(rest);
      const res = await fetch(api.ai.generate.path, {
        method: api.ai.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validatedInput, userName, sessionId: getSessionId(), daysWithApp: getRelationshipAge() }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate AI response");
      const data = await res.json();
      return parseWithLogging(api.ai.generate.responses[200], data, "ai.generate");
    },
  });
}

export function useChatWithVerse() {
  return useMutation({
    mutationFn: async (input: ChatRequest & { userName?: string }) => {
      const { userName, ...rest } = input;
      const validatedInput = api.ai.chat.input.parse(rest);
      const res = await fetch(api.ai.chat.path, {
        method: api.ai.chat.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validatedInput, userName, sessionId: getSessionId(), daysWithApp: getRelationshipAge() }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to get AI response");
      const data = await res.json();
      return parseWithLogging(api.ai.chat.responses[200], data, "ai.chat");
    },
  });
}
