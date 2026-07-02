import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { shareNative } from "@/lib/shareVerse";
import { NATIVE_PAGE, NATIVE_PRIMARY, NATIVE_TEXT, NATIVE_TEXT_MUTED, NATIVE_TEXT_SOFT } from "@/lib/nativeColors";
import { generateAppreciation, generatePrayer } from "@/lib/speakLife/api";
import { saveSpeakLifeEntry } from "@/lib/speakLife/archive";
import {
  detectEdgeCase,
  detectGodLanguage,
  displayName,
  extractSenderPhrases,
  parseRecipientInput,
} from "@/lib/speakLife/edgeCases";
import {
  INITIAL_SPEAK_LIFE_STATE,
  type EdgeCaseKind,
  type SpeakLifeConversationState,
  type SpeakLifePhase,
} from "@/lib/speakLife/types";

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  borderRadius: "12px",
  border: "none",
  background: NATIVE_PRIMARY,
  color: "#fff",
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: NATIVE_TEXT,
  fontSize: "15px",
  fontWeight: 500,
  cursor: "pointer",
};

function PromptCard({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "18px 20px",
        background: "rgba(196,78,224,0.08)",
        border: "1px solid rgba(196,78,224,0.20)",
        marginBottom: "20px",
      }}
    >
      {label ? (
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: NATIVE_TEXT_MUTED, marginBottom: 10 }}>
          {label}
        </p>
      ) : null}
      <div style={{ fontSize: "16px", lineHeight: 1.65, color: NATIVE_TEXT_SOFT, whiteSpace: "pre-wrap" }}>
        {children}
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
}) {
  const style: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: NATIVE_TEXT,
    fontSize: "16px",
    lineHeight: 1.5,
    outline: "none",
    resize: "none",
  };

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={style}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
    />
  );
}

export default function SpeakLifePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<SpeakLifePhase>("collecting_recipient");
  const [state, setState] = useState<SpeakLifeConversationState>(INITIAL_SPEAK_LIFE_STATE);
  const [draft, setDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingEdge, setPendingEdge] = useState<EdgeCaseKind>(null);

  const name = displayName(state.recipient_name);

  useEffect(() => {
    document.title = "Speak Life — Shepherd's Path";
  }, []);

  const patch = useCallback((partial: Partial<SpeakLifeConversationState>) => {
    setState((s) => ({ ...s, ...partial }));
  }, []);

  const runGenerateAppreciation = useCallback(async (next: SpeakLifeConversationState) => {
    setPhase("generating_appreciation");
    setErrorMsg(null);
    try {
      const result = await generateAppreciation(next);
      patch({
        appreciation_text: result.appreciation_text,
        recipient_is_living: result.detected.recipient_is_living ?? next.recipient_is_living,
        recipient_is_believer: result.detected.recipient_is_believer ?? next.recipient_is_believer,
        relationship_is_estranged: result.detected.relationship_is_estranged ?? next.relationship_is_estranged,
        sender_uses_god_language: result.detected.sender_uses_god_language ?? next.sender_uses_god_language,
        private_only:
          next.private_only ||
          result.detected.recipient_is_living === false ||
          next.recipient_is_living === false,
      });
      setPhase("review_appreciation");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }, [patch]);

  const handleRecipientContinue = () => {
    const raw = draft.trim();
    const edge = detectEdgeCase(raw);
    if (edge === "no_one" && !raw) {
      setPendingEdge("no_one");
      setPhase("edge_prompt");
      return;
    }
    if (edge) {
      setPendingEdge(edge);
      setPhase("edge_prompt");
      return;
    }

    const parsed = parseRecipientInput(raw);
    if (!parsed.name) {
      setPendingEdge("no_one");
      setPhase("edge_prompt");
      return;
    }

    patch({
      recipient_name: parsed.name,
      recipient_relationship: parsed.relationship,
    });
    setDraft("");
    setPhase("exchange_1");
  };

  const handleEdgeProceed = () => {
    if (pendingEdge === "no_one") {
      setDraft("");
      setPendingEdge(null);
      setPhase("collecting_recipient");
      return;
    }
    if (pendingEdge === "deceased") {
      const parsed = parseRecipientInput(draft.trim());
      patch({
        recipient_name: parsed.name || draft.trim(),
        recipient_relationship: parsed.relationship,
        recipient_is_living: false,
        private_only: true,
        edge_case: "deceased",
      });
      setDraft("");
      setPendingEdge(null);
      setPhase("exchange_1");
      return;
    }
    if (pendingEdge === "estranged") {
      const parsed = parseRecipientInput(draft.trim());
      patch({
        recipient_name: parsed.name || draft.trim(),
        recipient_relationship: parsed.relationship,
        relationship_is_estranged: true,
        edge_case: "estranged",
      });
      setDraft("");
      setPendingEdge(null);
      setPhase("exchange_1");
      return;
    }
    if (pendingEdge === "self") {
      patch({
        recipient_name: "Me",
        private_only: true,
        edge_case: "self",
      });
      setDraft("");
      setPendingEdge(null);
      setPhase("exchange_1");
      return;
    }
  };

  const handleEdgeExit = () => {
    navigate("/");
  };

  const handleExchangeSubmit = () => {
    const text = draft.trim();
    if (!text) return;

    if (phase === "exchange_1") {
      patch({ god_moment_captured: text });
      setDraft("");
      setPhase("exchange_2");
      return;
    }
    if (phase === "exchange_2") {
      patch({ specific_memory: text });
      setDraft("");
      setPhase("exchange_3");
      return;
    }
    if (phase === "exchange_3") {
      const phrases = extractSenderPhrases(
        state.god_moment_captured,
        state.specific_memory,
        text
      );
      const usesGod = detectGodLanguage(
        state.god_moment_captured,
        state.specific_memory,
        text,
        draft
      );
      const next: SpeakLifeConversationState = {
        ...state,
        what_god_sees: text,
        sender_exact_words: phrases,
        sender_uses_god_language: usesGod,
      };
      setState(next);
      setDraft("");
      void runGenerateAppreciation(next);
    }
  };

  const handleSavePrivate = () => {
    saveSpeakLifeEntry(state);
    patch({ garden_entry_created: true });
    setPhase("saved_private");
  };

  const handleCopy = async () => {
    if (!state.appreciation_text) return;
    try {
      await navigator.clipboard.writeText(state.appreciation_text);
      toast({ title: "Copied", description: "Message copied to clipboard." });
      patch({ sent_via: "copy", sent_at: new Date() });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!state.appreciation_text) return;
    const outcome = await shareNative({
      title: `For ${state.recipient_name}`,
      text: state.appreciation_text,
    });
    if (outcome === "shared" || outcome === "copied") {
      patch({ sent_via: "share", sent_at: new Date() });
      if (!state.garden_entry_created) {
        saveSpeakLifeEntry(state);
        patch({ garden_entry_created: true });
      }
      setPhase("complete");
    }
  };

  const handleSendFlow = () => {
    if (state.private_only || state.recipient_is_living === false) {
      handleSavePrivate();
      return;
    }
    patch({ appreciation_approved: true, prayer_offered: true });
    setPhase("prayer_offer");
  };

  const handlePrayerYes = async () => {
    patch({ prayer_accepted: true });
    setPhase("generating_prayer");
    try {
      const result = await generatePrayer(state);
      patch({ prayer_text: result.prayer_text });
      setPhase("review_prayer");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Prayer failed");
      setPhase("sending");
    }
  };

  const finishWithArchive = () => {
    if (!state.garden_entry_created) {
      saveSpeakLifeEntry(state);
      patch({ garden_entry_created: true });
    }
    setPhase("complete");
  };

  const renderEdgePrompt = () => {
    if (pendingEdge === "deceased") {
      return (
        <>
          <PromptCard>
            It sounds like {name} is no longer with us.
            {"\n\n"}
            Some people find there&apos;s still something healing about saying what needed to be said — even now.
            {"\n\n"}
            Would you like to write this for them? It can live in your 18:21 as a letter to God about what they meant.
          </PromptCard>
          <button type="button" style={{ ...btnPrimary, marginBottom: 10 }} onClick={handleEdgeProceed}>
            Yes, write for them
          </button>
          <button type="button" style={btnGhost} onClick={handleEdgeExit}>
            Not right now
          </button>
        </>
      );
    }
    if (pendingEdge === "estranged") {
      return (
        <>
          <PromptCard>
            It sounds like things between you and {name} have been complicated.
            {"\n\n"}
            That makes this more meaningful, not less.
            {"\n\n"}
            Would you like to say something true about what you saw in them — even across that distance?
          </PromptCard>
          <button type="button" style={{ ...btnPrimary, marginBottom: 10 }} onClick={handleEdgeProceed}>
            Continue gently
          </button>
          <button type="button" style={btnGhost} onClick={handleEdgeExit}>
            Not right now
          </button>
        </>
      );
    }
    if (pendingEdge === "self") {
      return (
        <>
          <PromptCard>
            Sometimes the most important words of life are the ones we&apos;ve never let ourselves receive.
          </PromptCard>
          <button type="button" style={{ ...btnPrimary, marginBottom: 10 }} onClick={handleEdgeProceed}>
            Continue
          </button>
          <button type="button" style={btnGhost} onClick={handleEdgeExit}>
            Not right now
          </button>
        </>
      );
    }
    return (
      <>
        <PromptCard>
          That&apos;s okay. Sometimes God brings someone to mind slowly.
          {"\n\n"}
          Is there anyone who&apos;s been on your heart lately — even quietly?
        </PromptCard>
        <TextInput value={draft} onChange={setDraft} placeholder="Name or relationship…" />
        <button
          type="button"
          style={{ ...btnPrimary, marginTop: 16, marginBottom: 10 }}
          onClick={() => {
            if (!draft.trim()) {
              setPhase("saved_private");
              return;
            }
            handleRecipientContinue();
          }}
        >
          Continue
        </button>
        <button
          type="button"
          style={btnGhost}
          onClick={() => {
            setPhase("saved_private");
          }}
        >
          When someone comes to mind, this will be here.
        </button>
      </>
    );
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: NATIVE_PAGE,
        color: NATIVE_TEXT,
        padding: "24px 20px 120px",
        maxWidth: 520,
        margin: "0 auto",
      }}
      data-testid="speak-life-page"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link href="/" style={{ fontSize: "14px", color: NATIVE_TEXT_MUTED, textDecoration: "none" }}>
          Home
        </Link>
        <Link href="/speak-life/archive" style={{ fontSize: "14px", color: NATIVE_TEXT_MUTED, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <BookOpen size={16} />
          18:21
        </Link>
      </div>

      <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: 6 }}>Speak Life</h1>
      <p style={{ fontSize: "15px", color: NATIVE_TEXT_SOFT, marginBottom: 8, lineHeight: 1.5 }}>
        Death and life are in the power of the tongue.
      </p>
      <p style={{ fontSize: "13px", color: NATIVE_TEXT_MUTED, marginBottom: 28 }}>Proverbs 18:21</p>

      {phase === "collecting_recipient" && (
        <>
          <PromptCard label="Step 1">
            Who has God placed in your life that needs to hear what He sees in them?
          </PromptCard>
          <p style={{ fontSize: "14px", color: NATIVE_TEXT_MUTED, marginBottom: 14, lineHeight: 1.5 }}>
            Take a breath. Ask God who comes to mind — then write their name or how you know them.
          </p>
          <TextInput value={draft} onChange={setDraft} placeholder="Name or relationship…" />
          <button type="button" style={{ ...btnPrimary, marginTop: 16 }} onClick={handleRecipientContinue}>
            Continue
          </button>
        </>
      )}

      {phase === "edge_prompt" && renderEdgePrompt()}

      {phase === "exchange_1" && (
        <>
          <PromptCard label="Step 2">
            How has God shown up through {name} in your life?
            {"\n\n"}
            Was there a season, a moment, or a way they carried something to you that you now understand was from Him?
          </PromptCard>
          <TextInput value={draft} onChange={setDraft} placeholder="Share what comes to mind…" multiline rows={5} />
          <button type="button" style={{ ...btnPrimary, marginTop: 16 }} onClick={handleExchangeSubmit}>
            Continue
          </button>
        </>
      )}

      {phase === "exchange_2" && (
        <>
          <PromptCard label="Step 3">
            When did you see it most clearly — when you realized God had placed {name} in your life on purpose?
          </PromptCard>
          <TextInput value={draft} onChange={setDraft} placeholder="A moment, a memory…" multiline rows={5} />
          <button type="button" style={{ ...btnPrimary, marginTop: 16 }} onClick={handleExchangeSubmit}>
            Continue
          </button>
        </>
      )}

      {phase === "exchange_3" && (
        <>
          <PromptCard label="Step 4">
            What do you believe God sees in {name} that they may not fully see in themselves?
            {"\n\n"}
            What do you want them to carry — about who they are, and how God has used them?
          </PromptCard>
          <TextInput value={draft} onChange={setDraft} placeholder="What you want them to know…" multiline rows={5} />
          <button type="button" style={{ ...btnPrimary, marginTop: 16 }} onClick={handleExchangeSubmit}>
            Continue
          </button>
        </>
      )}

      {phase === "generating_appreciation" && (
        <PromptCard label="Shaping your words">Listening to what you shared…</PromptCard>
      )}

      {(phase === "review_appreciation" || phase === "editing_appreciation") && (
        <>
          <PromptCard label="From what you shared">Here is a draft in your voice — edit anything that doesn&apos;t sound like you.</PromptCard>
          {phase === "editing_appreciation" ? (
            <TextInput
              value={state.appreciation_text ?? ""}
              onChange={(v) => patch({ appreciation_text: v })}
              placeholder=""
              multiline
              rows={8}
            />
          ) : (
            <div
              style={{
                borderRadius: "16px",
                padding: "20px",
                background: "rgba(196,78,224,0.08)",
                border: "1px solid rgba(196,78,224,0.18)",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: "16px", lineHeight: 1.7, color: NATIVE_TEXT_SOFT, whiteSpace: "pre-wrap" }}>
                {state.appreciation_text}
              </p>
            </div>
          )}

          {phase === "editing_appreciation" ? (
            <button
              type="button"
              style={{ ...btnPrimary, marginBottom: 10 }}
              onClick={() => setPhase("review_appreciation")}
            >
              Done editing
            </button>
          ) : (
            <>
              {!state.private_only && state.recipient_is_living !== false ? (
                <button type="button" style={{ ...btnPrimary, marginBottom: 10 }} onClick={handleSendFlow}>
                  Send this
                </button>
              ) : null}
              <button
                type="button"
                style={{ ...btnGhost, marginBottom: 10 }}
                onClick={() => setPhase("editing_appreciation")}
              >
                Edit first
              </button>
              <button type="button" style={btnGhost} onClick={handleSavePrivate}>
                Save privately
              </button>
            </>
          )}
        </>
      )}

      {phase === "prayer_offer" && (
        <>
          <PromptCard label="Before you send">
            Would you like to pray for {name} before this goes out?
          </PromptCard>
          <button type="button" style={{ ...btnPrimary, marginBottom: 10 }} onClick={handlePrayerYes}>
            Yes, pray
          </button>
          <button
            type="button"
            style={btnGhost}
            onClick={() => {
              patch({ prayer_accepted: false });
              setPhase("sending");
            }}
          >
            Not right now
          </button>
        </>
      )}

      {phase === "generating_prayer" && <PromptCard label="Prayer">Bringing this before God…</PromptCard>}

      {phase === "review_prayer" && state.prayer_text && (
        <>
          <PromptCard label={`A prayer for ${name}`}>You can speak this aloud, copy it, or keep it private.</PromptCard>
          <div
            style={{
              borderRadius: "16px",
              padding: "20px",
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.16)",
              marginBottom: 20,
            }}
          >
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: NATIVE_TEXT_SOFT, whiteSpace: "pre-wrap" }}>
              {state.prayer_text}
            </p>
          </div>
          <button type="button" style={{ ...btnPrimary, marginBottom: 10 }} onClick={() => setPhase("sending")}>
            Continue
          </button>
        </>
      )}

      {phase === "sending" && (
        <>
          <PromptCard label="Ready to send">However you send this — the words are yours.</PromptCard>
          <button type="button" style={{ ...btnPrimary, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleCopy}>
            <Copy size={18} />
            Copy message
          </button>
          <button type="button" style={{ ...btnGhost, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleShare}>
            <Share2 size={18} />
            Share
          </button>
          <button type="button" style={btnGhost} onClick={finishWithArchive}>
            Save to 18:21
          </button>
        </>
      )}

      {phase === "complete" && (
        <>
          <PromptCard>
            {state.private_only || state.recipient_is_living === false
              ? "This is yours now.\nAnd God heard every word."
              : "The word is spoken.\nMay it land where it needs to."}
          </PromptCard>
          <Link href="/speak-life/archive" style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
            View 18:21
          </Link>
          <Link href="/" style={{ ...btnGhost, display: "block", textAlign: "center", textDecoration: "none" }}>
            Home
          </Link>
        </>
      )}

      {phase === "saved_private" && (
        <>
          <PromptCard>
            {pendingEdge === "no_one" && !draft.trim()
              ? "When someone comes to mind, this will be here.\n\nThere's no rush."
              : state.recipient_is_living === false || state.edge_case === "deceased"
                ? "This is yours now.\nAnd God heard every word."
                : state.edge_case === "self"
                  ? "Sometimes the most important words of life are the ones we've never let ourselves receive."
                  : "Saved quietly in your 18:21."}
          </PromptCard>
          {state.garden_entry_created && (
            <Link href="/speak-life/archive" style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
              View 18:21
            </Link>
          )}
          <Link href="/" style={{ ...btnGhost, display: "block", textAlign: "center", textDecoration: "none" }}>
            Home
          </Link>
        </>
      )}

      {phase === "error" && (
        <>
          <PromptCard>{errorMsg ?? "Something went wrong. Your words are still here."}</PromptCard>
          <button type="button" style={btnPrimary} onClick={() => setPhase("exchange_3")}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
