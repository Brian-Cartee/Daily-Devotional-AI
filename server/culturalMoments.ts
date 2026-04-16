function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + offset + (nth - 1) * 7);
}

export interface CulturalMoment {
  label: string;
  aiNote: string;
  emailSubjectPrefix?: string;
}

export function getCulturalMoment(dateStr?: string): CulturalMoment | null {
  const date = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  const year = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  if (m === 1 && d === 1) {
    return {
      label: "New Year's Day",
      emailSubjectPrefix: "A new year —",
      aiNote: `\n\nToday is New Year's Day. Everyone around this person is focused on becoming a new version of themselves — resolutions, fresh starts, the pressure of potential. The deeper invitation is quieter: not reinvention, but honesty about where they actually are. Meet them there, not where the calendar says they should be. Do not reach for motivational language. Reach for truth.`,
    };
  }

  if (m === 12 && d === 31) {
    return {
      label: "New Year's Eve",
      emailSubjectPrefix: "The last day —",
      aiNote: `\n\nToday is the last day of the year. Some are celebrating; others are relieved it's ending; others are quietly carrying what the year cost them. Let the reflection acknowledge the weight of what they've walked through — without rushing toward new beginnings. You made it through more than you probably give yourself credit for. Let that land.`,
    };
  }

  if (m === 2 && d === 14) {
    return {
      label: "Valentine's Day",
      emailSubjectPrefix: "On a day like today —",
      aiNote: `\n\nToday is Valentine's Day. Some people feel celebrated and seen; others feel the quiet ache of loneliness, a love they lost, or a longing that hasn't been answered. Do not assume which. Let the reflection hold space for both. Whatever this verse carries today, let it reach the person who most needs to know they are not invisible.`,
    };
  }

  const mothersDaySunday = nthWeekdayOfMonth(year, 5, 0, 2);
  if (m === 5 && d === mothersDaySunday.getDate()) {
    return {
      label: "Mother's Day",
      emailSubjectPrefix: "Today, of all days —",
      aiNote: `\n\nFor many, today is Mother's Day. For some it is a day of warmth and celebration. For others it carries real grief — a mother who is gone, a relationship that is complicated, a longing for children that hasn't been answered, or the weight of feeling like they've fallen short. Do not assume this day is easy. Hold the full range of what it can mean, and let the verse speak to wherever they are in it.`,
    };
  }

  const fathersDaySunday = nthWeekdayOfMonth(year, 6, 0, 3);
  if (m === 6 && d === fathersDaySunday.getDate()) {
    return {
      label: "Father's Day",
      emailSubjectPrefix: "Today, of all days —",
      aiNote: `\n\nFor many, today is Father's Day. For some it is a day of gratitude and warmth. For others it is complicated — a father who wasn't there, a relationship that never fully healed, a loss that is still fresh. Do not assume this day feels celebratory. Let the reflection meet whatever this day actually holds for the person, not what the occasion says it should.`,
    };
  }

  if (m === 6 && d === 21) {
    return {
      label: "First Day of Summer",
      aiNote: `\n\nToday is the first day of summer — the season when everything is supposed to feel lighter and slower. But for many people, the pace doesn't actually change, and the brightness of the season can quietly highlight what still feels unresolved. Meet this person in whatever summer they are actually having, not the one everyone else seems to be having.`,
    };
  }

  const laborDay = nthWeekdayOfMonth(year, 9, 1, 1);
  const laborDayDate = laborDay.getDate();
  if (m === 9 && (d === laborDayDate || d === laborDayDate - 1 || d === laborDayDate - 2)) {
    return {
      label: "Labor Day / Back to School",
      aiNote: `\n\nFor many, this is the season of fresh starts — new school years, new rhythms, new beginnings. There is something quietly hopeful about it. But a fresh start doesn't automatically reset the weight someone has been carrying. Meet them in both: the real hope of beginning again, and the honest reality that they brought themselves with them into the new season.`,
    };
  }

  const thanksgiving = nthWeekdayOfMonth(year, 11, 4, 4);
  if (m === 11 && d === thanksgiving.getDate()) {
    return {
      label: "Thanksgiving",
      emailSubjectPrefix: "On a day of thanks —",
      aiNote: `\n\nFor many, today is Thanksgiving — a day explicitly structured around gratitude. That can feel freeing, or it can feel like pressure, depending on the season someone is in. If this person is struggling, being told to feel grateful can feel like one more thing they're failing at. Let the reflection hold the honest complexity of gratitude: that God meets us in the reaching toward it, not only when we've arrived.`,
    };
  }

  return null;
}

export function getCulturalMomentNote(dateStr?: string): string {
  return getCulturalMoment(dateStr)?.aiNote ?? "";
}

export function getCulturalMomentEmailSubject(dateStr?: string, verseRef?: string): string | null {
  const moment = getCulturalMoment(dateStr);
  if (!moment?.emailSubjectPrefix) return null;
  return verseRef ? `${moment.emailSubjectPrefix} ${verseRef}` : moment.emailSubjectPrefix;
}
