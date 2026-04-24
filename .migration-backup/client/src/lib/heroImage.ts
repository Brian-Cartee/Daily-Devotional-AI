const ROTATION_DAYS = 10;
const VARIANTS = 3;

function periodIndex(): number {
  const periodMs = ROTATION_DAYS * 24 * 60 * 60 * 1000;
  return Math.floor(Date.now() / periodMs) % VARIANTS;
}

const HEROES: Record<string, string[]> = {
  devotional: ["/hero-devotional.png", "/hero-devotional-2.png", "/hero-devotional-3.png"],
  understand: ["/hero-understand.png", "/hero-understand-2.png", "/hero-understand-3.png"],
  read: ["/hero-read.png", "/hero-read-2.png", "/hero-read-3.png"],
};

export function getHeroImage(name: "devotional" | "understand" | "read"): string {
  const variants = HEROES[name];
  return variants[periodIndex() % variants.length];
}
