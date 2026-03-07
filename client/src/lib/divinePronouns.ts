export function capitalizeDivinePronouns(text: string): string {
  return text
    .replace(/\bhe\b/g, "He")
    .replace(/\bhim\b/g, "Him")
    .replace(/\bhis\b/g, "His")
    .replace(/\bhimself\b/g, "Himself")
    .replace(/\byou\b/g, "You")
    .replace(/\byour\b/g, "Your")
    .replace(/\byours\b/g, "Yours")
    .replace(/\bHe's\b/g, "He's")
    .replace(/\bhe's\b/g, "He's");
}
