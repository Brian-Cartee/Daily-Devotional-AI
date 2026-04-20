export type EmotionType =
  | "anxiety"
  | "overwhelmed"
  | "anger"
  | "forgiveness"
  | "fear"
  | "doubt"
  | "control"
  | "pride"
  | "comparison"
  | "loneliness"
  | "temptation"
  | "discouragement"
  | "impatience"
  | "confusion"
  | "guilt"
  | "shame"
  | "busyness"
  | "decision-making"
  | "spiritual-dryness"
  | "returning-to-faith";

const WALK_TODAY: Record<EmotionType, string[]> = {
  anxiety: [
    "Pause once today, breathe, and give that worry to God before you try to solve it yourself.",
    "The next time anxiety rises, hand it over before you pick it back up — just once today.",
    "Choose one moment today to stop, breathe, and trust instead of control.",
  ],
  overwhelmed: [
    "Do the next small thing in front of you, and trust God with everything else you can't control.",
    "Take the one step that's right in front of you — nothing more than that today.",
    "Set down everything except what's directly in front of you, and take that one step.",
  ],
  anger: [
    "Before you respond today, take one moment to slow down and choose a softer answer.",
    "Pause before you speak — just long enough to choose a different tone.",
    "When the moment comes, take a breath before you react. That breath is the practice.",
  ],
  forgiveness: [
    "Release the offense once today, even if your feelings haven't caught up yet.",
    "Choose to let go of it once — not because it wasn't real, but because you're free to.",
    "Practice releasing it once today — not to excuse it, but to free yourself from carrying it.",
  ],
  fear: [
    "Take one step forward today, even if you still feel afraid.",
    "Do the thing that scares you — just the first part of it.",
    "Move one step in the direction you're avoiding, and let God meet you there.",
  ],
  doubt: [
    "Bring your doubt to God honestly instead of hiding it.",
    "Say out loud what you're uncertain about — doubt brought into the light doesn't grow the same way.",
    "Tell God exactly what you're struggling to believe. He can handle it.",
  ],
  control: [
    "Let go of one thing today that you're trying to force.",
    "Identify the thing you're gripping tightest — and open your hand, just for today.",
    "Choose one situation to release instead of manage. Just one.",
  ],
  pride: [
    "Choose humility in one moment where you'd normally defend yourself.",
    "When the urge to prove yourself comes, let it pass — once today.",
    "Pick one interaction today where you choose to listen more than speak.",
  ],
  comparison: [
    "Stay in your lane today — don't measure your life against someone else's.",
    "Every time comparison shows up today, redirect your attention back to your own path.",
    "Notice when you start comparing, and gently come back to what God has placed in front of you.",
  ],
  loneliness: [
    "Reach out to one person instead of withdrawing.",
    "Send the message you've been putting off — connection doesn't have to wait for perfect timing.",
    "Make one small move toward someone today instead of pulling back.",
  ],
  temptation: [
    "Walk away earlier than you normally would.",
    "Leave the situation before it becomes a battle — earlier is always easier.",
    "Make the decision before you're in the middle of it. Set the boundary now.",
  ],
  discouragement: [
    "Keep going today, even if it feels like nothing is changing.",
    "Take the next step even when you can't see the result — that's what faithfulness looks like.",
    "Show up today the same way you would if things were going well. That's the practice.",
  ],
  impatience: [
    "Wait without rushing the outcome.",
    "Choose to be present in the waiting rather than anxious about what comes next.",
    "Practice slowness in one area today — let the thing unfold without forcing it.",
  ],
  confusion: [
    "Take the next right step, not the whole path.",
    "You don't need to see the whole road — just the step that's right in front of you.",
    "Do the one thing you're most sure of, and trust that the rest will become clearer.",
  ],
  guilt: [
    "Accept God's forgiveness instead of replaying your mistake.",
    "Receive the forgiveness that's already been given — replaying it changes nothing.",
    "Let what's been forgiven stay forgiven. That's not denial — it's trust.",
  ],
  shame: [
    "Speak truth over yourself instead of what you feel.",
    "Choose one true thing about who you are in God, and hold onto it today.",
    "When shame speaks, answer it with what Scripture says about you instead.",
  ],
  busyness: [
    "Make space for one quiet moment with God today.",
    "Put down the list for five minutes — not to be productive, just to be present.",
    "Find one gap in your day and don't fill it. Let it be still.",
  ],
  "decision-making": [
    "Choose what aligns with truth, not just what feels easiest.",
    "Make the decision you'd be at peace with a year from now, not the one that relieves pressure today.",
    "Before you decide, ask: does this align with what I know to be true? Then move from there.",
  ],
  "spiritual-dryness": [
    "Show up anyway — even if you don't feel anything.",
    "Go through the motion of connection even when your heart feels far. Faithfulness often comes before feeling.",
    "Do one small act of faith today without expecting to feel it — just as an offering.",
  ],
  "returning-to-faith": [
    "Take one step back toward God today — no matter how small.",
    "You don't need to make up for the distance. Just take the next step from where you are.",
    "Come back the way you can, not the way you think you should. One step is enough.",
  ],
};

let lastIndex: Partial<Record<EmotionType, number>> = {};

export function getWalkThisToday(emotionType: EmotionType): string {
  const options = WALK_TODAY[emotionType];
  if (!options || options.length === 0) return "";

  const prev = lastIndex[emotionType] ?? -1;
  let next: number;
  if (options.length === 1) {
    next = 0;
  } else {
    do {
      next = Math.floor(Math.random() * options.length);
    } while (next === prev);
  }
  lastIndex[emotionType] = next;
  return options[next];
}

export const WALK_TODAY_DATA = WALK_TODAY;
