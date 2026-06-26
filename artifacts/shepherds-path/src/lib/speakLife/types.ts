export type SpeakLifePhase =
  | "opening"
  | "collecting_recipient"
  | "edge_prompt"
  | "exchange_1"
  | "exchange_2"
  | "exchange_3"
  | "generating_appreciation"
  | "review_appreciation"
  | "editing_appreciation"
  | "prayer_offer"
  | "generating_prayer"
  | "review_prayer"
  | "sending"
  | "complete"
  | "saved_private"
  | "error";

export type EdgeCaseKind = "deceased" | "estranged" | "no_one" | "self" | null;

export interface SpeakLifeConversationState {
  recipient_name: string;
  recipient_relationship: string | null;
  recipient_is_living: boolean | null;
  recipient_is_believer: boolean | null;
  relationship_is_estranged: boolean;

  god_moment_captured: string | null;
  specific_memory: string | null;
  what_god_sees: string | null;
  sender_exact_words: string[];
  sender_uses_god_language: boolean;

  appreciation_text: string | null;
  appreciation_approved: boolean;

  prayer_offered: boolean;
  prayer_accepted: boolean;
  prayer_text: string | null;

  sent_at: Date | null;
  sent_via: "text" | "email" | "link" | "copy" | "share" | null;
  garden_entry_created: boolean;

  edge_case: EdgeCaseKind;
  private_only: boolean;
}

export interface SpeakLifeArchiveEntry {
  id: string;
  recipient_name: string;
  appreciation_text: string;
  prayer_text: string | null;
  saved_at: string;
  private_only: boolean;
  recipient_is_living: boolean | null;
}

export const INITIAL_SPEAK_LIFE_STATE: SpeakLifeConversationState = {
  recipient_name: "",
  recipient_relationship: null,
  recipient_is_living: null,
  recipient_is_believer: null,
  relationship_is_estranged: false,
  god_moment_captured: null,
  specific_memory: null,
  what_god_sees: null,
  sender_exact_words: [],
  sender_uses_god_language: false,
  appreciation_text: null,
  appreciation_approved: false,
  prayer_offered: false,
  prayer_accepted: false,
  prayer_text: null,
  sent_at: null,
  sent_via: null,
  garden_entry_created: false,
  edge_case: null,
  private_only: false,
};
