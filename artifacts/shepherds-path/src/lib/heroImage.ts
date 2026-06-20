const ROTATION_DAYS = 10;
const VARIANTS = 3;

function periodIndex(): number {
  const periodMs = ROTATION_DAYS * 24 * 60 * 60 * 1000;
  return Math.floor(Date.now() / periodMs) % VARIANTS;
}

const HEROES: Record<string, string[]> = {
  devotional: ["/hero-devotional.webp", "/hero-devotional-2.webp", "/hero-devotional-3.webp"],
  understand: ["/hero-understand.webp", "/hero-understand-2.webp", "/hero-understand-3.webp"],
  read: ["/hero-read.webp", "/hero-read-2.webp", "/hero-read-3.webp"],
};

export function getHeroImage(name: "devotional" | "understand" | "read"): string {
  const variants = HEROES[name];
  return variants[periodIndex() % variants.length];
}
