/**
 * Shepherd's Path — 180-Day Verse Fetcher
 * Fetches all 180 anchor verses from bible-api.com (WEB translation, public domain)
 * and writes a CSV ready to paste into the Google Sheet.
 *
 * Usage:  node scripts/fetch-verses.mjs
 * Output: scripts/verses-output.csv
 */

import { writeFileSync } from "fs";

// ─── Start date (Day 1) ───────────────────────────────────────────────────────
const START_DATE = new Date("2026-06-16");

// ─── Complete 180-day blueprint ───────────────────────────────────────────────
const DAYS = [
  // COMING HOME (Days 1–21)
  { day: 1,   season: "Coming Home",                      theme: "The Father Runs Toward You",        ref: "Luke 15:20" },
  { day: 2,   season: "Coming Home",                      theme: "God Is Near the Broken",            ref: "Psalm 34:18" },
  { day: 3,   season: "Coming Home",                      theme: "Come and Rest",                     ref: "Matthew 11:28" },
  { day: 4,   season: "Coming Home",                      theme: "Redeemed and Called Back",          ref: "Isaiah 44:22" },
  { day: 5,   season: "Coming Home",                      theme: "Jesus Seeks the Lost",              ref: "Luke 19:10" },
  { day: 6,   season: "Coming Home",                      theme: "Mercy Before Merit",                ref: "Ephesians 2:4-5" },
  { day: 7,   season: "Coming Home (Sabbath)",            theme: "Be Still",                          ref: "Psalm 46:10" },
  { day: 8,   season: "Coming Home",                      theme: "Made New",                          ref: "2 Corinthians 5:17" },
  { day: 9,   season: "Coming Home",                      theme: "Called By Name",                    ref: "Isaiah 43:1" },
  { day: 10,  season: "Coming Home",                      theme: "Welcomed, Not Rejected",            ref: "John 6:37" },
  { day: 11,  season: "Coming Home",                      theme: "Grace to Approach",                 ref: "Hebrews 4:16" },
  { day: 12,  season: "Coming Home",                      theme: "Everlasting Love",                  ref: "Jeremiah 31:3" },
  { day: 13,  season: "Coming Home",                      theme: "Loved First",                       ref: "1 John 4:19" },
  { day: 14,  season: "Coming Home (Sabbath)",            theme: "Return to Rest",                    ref: "Psalm 116:7" },
  { day: 15,  season: "Coming Home",                      theme: "Honest Return",                     ref: "Luke 15:18" },
  { day: 16,  season: "Coming Home",                      theme: "Loved While Messy",                 ref: "Romans 5:8" },
  { day: 17,  season: "Coming Home",                      theme: "Healing the Wounded",               ref: "Psalm 147:3" },
  { day: 18,  season: "Coming Home",                      theme: "Saved by Grace",                    ref: "Ephesians 2:8" },
  { day: 19,  season: "Coming Home",                      theme: "The Shepherd Seeks",                ref: "Ezekiel 34:16" },
  { day: 20,  season: "Coming Home",                      theme: "Grace Has Appeared",                ref: "Titus 2:11" },
  { day: 21,  season: "Coming Home (Sabbath)",            theme: "The Shepherd Is Enough",            ref: "Psalm 23:1" },

  // BEING KNOWN (Days 22–42)
  { day: 22,  season: "Being Known",                      theme: "Wonderfully Made",                  ref: "Psalm 139:14" },
  { day: 23,  season: "Being Known",                      theme: "Chosen Before You Knew",            ref: "Ephesians 1:4" },
  { day: 24,  season: "Being Known",                      theme: "Precious in His Sight",             ref: "Isaiah 43:4" },
  { day: 25,  season: "Being Known",                      theme: "Called Children of God",            ref: "1 John 3:1" },
  { day: 26,  season: "Being Known",                      theme: "Fully Known",                       ref: "Psalm 139:1" },
  { day: 27,  season: "Being Known",                      theme: "God's Workmanship",                 ref: "Ephesians 2:10" },
  { day: 28,  season: "Being Known (Sabbath)",            theme: "Rest in Being Loved",               ref: "Romans 8:38-39" },
  { day: 29,  season: "Being Known",                      theme: "Written on His Hands",              ref: "Isaiah 49:16" },
  { day: 30,  season: "Being Known",                      theme: "Known by the Shepherd",             ref: "John 10:14" },
  { day: 31,  season: "Being Known",                      theme: "No Fear in Adoption",               ref: "Romans 8:15" },
  { day: 32,  season: "Being Known",                      theme: "Chosen and Beloved",                ref: "Colossians 3:12" },
  { day: 33,  season: "Being Known",                      theme: "God Knows Your Sitting and Rising", ref: "Psalm 139:2" },
  { day: 34,  season: "Being Known",                      theme: "Not Servants, But Friends",         ref: "John 15:15" },
  { day: 35,  season: "Being Known (Sabbath)",            theme: "Quieted by Love",                   ref: "Zephaniah 3:17" },
  { day: 36,  season: "Being Known",                      theme: "A Treasured People",                ref: "1 Peter 2:9" },
  { day: 37,  season: "Being Known",                      theme: "Known Before Birth",                ref: "Jeremiah 1:5" },
  { day: 38,  season: "Being Known",                      theme: "Delighted Over",                    ref: "Deuteronomy 33:12" },
  { day: 39,  season: "Being Known",                      theme: "Seen in Secret",                    ref: "Matthew 6:6" },
  { day: 40,  season: "Being Known",                      theme: "Held Fast",                         ref: "Psalm 139:10" },
  { day: 41,  season: "Being Known",                      theme: "Sealed With the Spirit",            ref: "Ephesians 1:13" },
  { day: 42,  season: "Being Known (Sabbath)",            theme: "Held in Perfect Peace",             ref: "Isaiah 26:3" },

  // IN THE VALLEY (Days 43–63)
  { day: 43,  season: "In the Valley",                    theme: "Honest Lament",                     ref: "Psalm 13:1" },
  { day: 44,  season: "In the Valley",                    theme: "Tears Are Seen",                    ref: "Psalm 56:8" },
  { day: 45,  season: "In the Valley",                    theme: "Jesus Knows Sorrow",                ref: "Matthew 26:38" },
  { day: 46,  season: "In the Valley",                    theme: "Hope While Downcast",               ref: "Psalm 42:11" },
  { day: 47,  season: "In the Valley",                    theme: "Mercy in the Morning",              ref: "Lamentations 3:22-23" },
  { day: 48,  season: "In the Valley",                    theme: "Strength for the Weary",            ref: "Isaiah 40:29" },
  { day: 49,  season: "In the Valley (Sabbath)",          theme: "Rest for Heavy Souls",              ref: "Matthew 11:29" },
  { day: 50,  season: "In the Valley",                    theme: "Help My Unbelief",                  ref: "Mark 9:24" },
  { day: 51,  season: "In the Valley",                    theme: "Grace in Weakness",                 ref: "2 Corinthians 12:9" },
  { day: 52,  season: "In the Valley",                    theme: "Waiting With Courage",              ref: "Psalm 27:14" },
  { day: 53,  season: "In the Valley",                    theme: "Joy Without Circumstances",         ref: "Habakkuk 3:17-18" },
  { day: 54,  season: "In the Valley",                    theme: "Jesus Wept",                        ref: "John 11:35" },
  { day: 55,  season: "In the Valley",                    theme: "God Is a Refuge",                   ref: "Psalm 46:1" },
  { day: 56,  season: "In the Valley (Sabbath)",          theme: "Peace Beyond Understanding",        ref: "Philippians 4:7" },
  { day: 57,  season: "In the Valley",                    theme: "Not Crushed",                       ref: "2 Corinthians 4:8-9" },
  { day: 58,  season: "In the Valley",                    theme: "God Hears the Cry",                 ref: "Psalm 18:6" },
  { day: 59,  season: "In the Valley",                    theme: "A Bruised Reed",                    ref: "Isaiah 42:3" },
  { day: 60,  season: "In the Valley",                    theme: "Light in Darkness",                 ref: "Micah 7:8" },
  { day: 61,  season: "In the Valley",                    theme: "Remembering Hope",                  ref: "Lamentations 3:21" },
  { day: 62,  season: "In the Valley",                    theme: "The Lord Is Near",                  ref: "Psalm 145:18" },
  { day: 63,  season: "In the Valley (Sabbath)",          theme: "Refuge Under His Wings",            ref: "Psalm 91:1-2" },

  // COURAGE & SURRENDER (Days 64–84)
  { day: 64,  season: "Courage & Surrender",              theme: "Trust Beyond Understanding",        ref: "Proverbs 3:5-6" },
  { day: 65,  season: "Courage & Surrender",              theme: "Be Strong and Courageous",          ref: "Joshua 1:9" },
  { day: 66,  season: "Courage & Surrender",              theme: "God Fights for You",                ref: "Exodus 14:14" },
  { day: 67,  season: "Courage & Surrender",              theme: "Cast Your Cares",                   ref: "1 Peter 5:7" },
  { day: 68,  season: "Courage & Surrender",              theme: "Peace in the Storm",                ref: "Mark 4:39-40" },
  { day: 69,  season: "Courage & Surrender",              theme: "Walk by Faith",                     ref: "2 Corinthians 5:7" },
  { day: 70,  season: "Courage & Surrender (Sabbath)",    theme: "Quiet Confidence",                  ref: "Isaiah 30:15" },
  { day: 71,  season: "Courage & Surrender",              theme: "Fear Not, I Am With You",           ref: "Isaiah 41:10" },
  { day: 72,  season: "Courage & Surrender",              theme: "Strength Through Christ",           ref: "Philippians 4:13" },
  { day: 73,  season: "Courage & Surrender",              theme: "He Goes Before You",                ref: "Deuteronomy 31:8" },
  { day: 74,  season: "Courage & Surrender",              theme: "The Lord Is My Light",              ref: "Psalm 27:1" },
  { day: 75,  season: "Courage & Surrender",              theme: "Anchor for the Soul",               ref: "Hebrews 6:19" },
  { day: 76,  season: "Courage & Surrender",              theme: "Making a Way",                      ref: "Isaiah 43:19" },
  { day: 77,  season: "Courage & Surrender (Sabbath)",    theme: "Sleep in Peace",                    ref: "Psalm 4:8" },
  { day: 78,  season: "Courage & Surrender",              theme: "Fix Your Eyes on Jesus",            ref: "Hebrews 12:2" },
  { day: 79,  season: "Courage & Surrender",              theme: "Courage for Tomorrow",              ref: "Deuteronomy 31:6" },
  { day: 80,  season: "Courage & Surrender",              theme: "Perfect Love Casts Out Fear",       ref: "1 John 4:18" },
  { day: 81,  season: "Courage & Surrender",              theme: "The Battle Is the Lord's",          ref: "2 Chronicles 20:15" },
  { day: 82,  season: "Courage & Surrender",              theme: "Lift Up Your Eyes",                 ref: "Psalm 121:1-2" },
  { day: 83,  season: "Courage & Surrender",              theme: "Held by His Hand",                  ref: "Isaiah 41:13" },
  { day: 84,  season: "Courage & Surrender (Sabbath)",    theme: "Rest in Waiting",                   ref: "Psalm 37:7" },

  // GRATITUDE & PRESENCE (Days 85–105)
  { day: 85,  season: "Gratitude & Presence",             theme: "This Is the Day",                   ref: "Psalm 118:24" },
  { day: 86,  season: "Gratitude & Presence",             theme: "Give Thanks Always",                ref: "1 Thessalonians 5:16-18" },
  { day: 87,  season: "Gratitude & Presence",             theme: "Daily Bread",                       ref: "Matthew 6:11" },
  { day: 88,  season: "Gratitude & Presence",             theme: "The Lord Is My Portion",            ref: "Lamentations 3:24" },
  { day: 89,  season: "Gratitude & Presence",             theme: "Every Good Gift",                   ref: "James 1:17" },
  { day: 90,  season: "Gratitude & Presence",             theme: "Taste and See",                     ref: "Psalm 34:8" },
  { day: 91,  season: "Gratitude & Presence (Sabbath)",   theme: "Green Pastures",                    ref: "Psalm 23:2-3" },
  { day: 92,  season: "Gratitude & Presence",             theme: "Seek First the Kingdom",            ref: "Matthew 6:33" },
  { day: 93,  season: "Gratitude & Presence",             theme: "Rejoice in the Lord",               ref: "Philippians 4:4" },
  { day: 94,  season: "Gratitude & Presence",             theme: "Surely God Is Here",                ref: "Genesis 28:16" },
  { day: 95,  season: "Gratitude & Presence",             theme: "Abide in Me",                       ref: "John 15:4" },
  { day: 96,  season: "Gratitude & Presence",             theme: "Let Peace Rule",                    ref: "Colossians 3:15" },
  { day: 97,  season: "Gratitude & Presence",             theme: "The Earth Is Full of His Love",     ref: "Psalm 33:5" },
  { day: 98,  season: "Gratitude & Presence (Sabbath)",   theme: "My Presence Will Go With You",      ref: "Exodus 33:14" },
  { day: 99,  season: "Gratitude & Presence",             theme: "Morning by Morning",                ref: "Isaiah 50:4" },
  { day: 100, season: "Gratitude & Presence",             theme: "Delight Yourself in the Lord",      ref: "Psalm 37:4" },
  { day: 101, season: "Gratitude & Presence",             theme: "Contentment Learned",               ref: "Philippians 4:11-12" },
  { day: 102, season: "Gratitude & Presence",             theme: "Fullness of Joy",                   ref: "Psalm 16:11" },
  { day: 103, season: "Gratitude & Presence",             theme: "His Love Endures Forever",          ref: "Psalm 136:1" },
  { day: 104, season: "Gratitude & Presence",             theme: "The Father Is Working",             ref: "John 5:17" },
  { day: 105, season: "Gratitude & Presence (Sabbath)",   theme: "Come Away and Rest",                ref: "Mark 6:31" },

  // PURPOSE & CALLING (Days 106–126)
  { day: 106, season: "Purpose & Calling",                theme: "Gifted by Grace",                   ref: "Romans 12:6" },
  { day: 107, season: "Purpose & Calling",                theme: "Let Your Light Shine",              ref: "Matthew 5:16" },
  { day: 108, season: "Purpose & Calling",                theme: "Beautiful Feet",                    ref: "Isaiah 52:7" },
  { day: 109, season: "Purpose & Calling",                theme: "Faithful in Small Things",          ref: "Luke 16:10" },
  { day: 110, season: "Purpose & Calling",                theme: "A City on a Hill",                  ref: "Matthew 5:14" },
  { day: 111, season: "Purpose & Calling",                theme: "Equipped for Good Work",            ref: "2 Timothy 3:16-17" },
  { day: 112, season: "Purpose & Calling (Sabbath)",      theme: "Ordered Steps",                     ref: "Psalm 37:23" },
  { day: 113, season: "Purpose & Calling",                theme: "Called According to Purpose",       ref: "Romans 8:28" },
  { day: 114, season: "Purpose & Calling",                theme: "Serve Through Love",                ref: "Galatians 5:13" },
  { day: 115, season: "Purpose & Calling",                theme: "Christ's Ambassadors",              ref: "2 Corinthians 5:20" },
  { day: 116, season: "Purpose & Calling",                theme: "Do Justice",                        ref: "Amos 5:24" },
  { day: 117, season: "Purpose & Calling",                theme: "Use Your Gifts",                    ref: "1 Peter 4:10" },
  { day: 118, season: "Purpose & Calling",                theme: "Send Me",                           ref: "Isaiah 6:8" },
  { day: 119, season: "Purpose & Calling (Sabbath)",      theme: "Commit Your Way",                   ref: "Psalm 37:5" },
  { day: 120, season: "Purpose & Calling",                theme: "Run the Race",                      ref: "Hebrews 12:1" },
  { day: 121, season: "Purpose & Calling",                theme: "Work for the Lord",                 ref: "Colossians 3:23" },
  { day: 122, season: "Purpose & Calling",                theme: "Created to Bear Fruit",             ref: "John 15:16" },
  { day: 123, season: "Purpose & Calling",                theme: "Seek the Good of Others",           ref: "Philippians 2:4" },
  { day: 124, season: "Purpose & Calling",                theme: "Steward What Is Entrusted",         ref: "1 Corinthians 4:2" },
  { day: 125, season: "Purpose & Calling",                theme: "Build the Kingdom",                 ref: "Nehemiah 2:18" },
  { day: 126, season: "Purpose & Calling (Sabbath)",      theme: "Establish the Work of Our Hands",   ref: "Psalm 90:17" },

  // HOPE & ENDURANCE (Days 127–147)
  { day: 127, season: "Hope & Endurance",                 theme: "Hope Does Not Disappoint",          ref: "Romans 5:5" },
  { day: 128, season: "Hope & Endurance",                 theme: "Wait on the Lord",                  ref: "Isaiah 40:31" },
  { day: 129, season: "Hope & Endurance",                 theme: "He Will Complete It",               ref: "Philippians 1:6" },
  { day: 130, season: "Hope & Endurance",                 theme: "Eternal Weight of Glory",           ref: "2 Corinthians 4:17" },
  { day: 131, season: "Hope & Endurance",                 theme: "Strength for Each Day",             ref: "Deuteronomy 33:25" },
  { day: 132, season: "Hope & Endurance",                 theme: "Rejoice in Hope",                   ref: "Romans 12:12" },
  { day: 133, season: "Hope & Endurance (Sabbath)",       theme: "Our Dwelling Place",                ref: "Psalm 90:1" },
  { day: 134, season: "Hope & Endurance",                 theme: "Overflowing Hope",                  ref: "Romans 15:13" },
  { day: 135, season: "Hope & Endurance",                 theme: "Joy Comes in the Morning",          ref: "Psalm 30:5" },
  { day: 136, season: "Hope & Endurance",                 theme: "Crown of Life",                     ref: "James 1:12" },
  { day: 137, season: "Hope & Endurance",                 theme: "Do Not Grow Weary",                 ref: "Galatians 6:9" },
  { day: 138, season: "Hope & Endurance",                 theme: "Cast Your Burden",                  ref: "Psalm 55:22" },
  { day: 139, season: "Hope & Endurance",                 theme: "Look to the Unseen",                ref: "2 Corinthians 4:18" },
  { day: 140, season: "Hope & Endurance (Sabbath)",       theme: "Blessed Hope",                      ref: "Titus 2:13" },
  { day: 141, season: "Hope & Endurance",                 theme: "He Will Wipe Every Tear",           ref: "Revelation 21:4" },
  { day: 142, season: "Hope & Endurance",                 theme: "Though the Earth Give Way",         ref: "Psalm 46:2" },
  { day: 143, season: "Hope & Endurance",                 theme: "Faithful Through Fire",             ref: "Daniel 3:17-18" },
  { day: 144, season: "Hope & Endurance",                 theme: "Strengthened with Power",           ref: "Ephesians 3:16" },
  { day: 145, season: "Hope & Endurance",                 theme: "The Lord Sustains",                 ref: "Psalm 3:5" },
  { day: 146, season: "Hope & Endurance",                 theme: "Endure Hardship",                   ref: "2 Timothy 2:3" },
  { day: 147, season: "Hope & Endurance (Sabbath)",       theme: "Safe in His Hands",                 ref: "John 10:28" },

  // COMMUNITY & FORGIVENESS (Days 148–168)
  { day: 148, season: "Community & Forgiveness",          theme: "Bear One Another's Burdens",        ref: "Galatians 6:2" },
  { day: 149, season: "Community & Forgiveness",          theme: "Forgive as Christ Forgave",         ref: "Colossians 3:13" },
  { day: 150, season: "Community & Forgiveness",          theme: "Love One Another",                  ref: "John 13:34" },
  { day: 151, season: "Community & Forgiveness",          theme: "Quick to Listen",                   ref: "James 1:19" },
  { day: 152, season: "Community & Forgiveness",          theme: "Live in Harmony",                   ref: "Romans 12:16" },
  { day: 153, season: "Community & Forgiveness",          theme: "Kind and Tenderhearted",            ref: "Ephesians 4:32" },
  { day: 154, season: "Community & Forgiveness (Sabbath)",theme: "Blessed Are the Peacemakers",       ref: "Matthew 5:9" },
  { day: 155, season: "Community & Forgiveness",          theme: "Love Covers Many Sins",             ref: "1 Peter 4:8" },
  { day: 156, season: "Community & Forgiveness",          theme: "Encourage One Another",             ref: "Hebrews 10:24-25" },
  { day: 157, season: "Community & Forgiveness",          theme: "Welcome One Another",               ref: "Romans 15:7" },
  { day: 158, season: "Community & Forgiveness",          theme: "Consider Others Above Yourself",    ref: "Philippians 2:3" },
  { day: 159, season: "Community & Forgiveness",          theme: "Speak the Truth in Love",           ref: "Ephesians 4:15" },
  { day: 160, season: "Community & Forgiveness",          theme: "Be Devoted to One Another",         ref: "Romans 12:10" },
  { day: 161, season: "Community & Forgiveness (Sabbath)",theme: "How Good It Is",                    ref: "Psalm 133:1" },
  { day: 162, season: "Community & Forgiveness",          theme: "Confess and Pray",                  ref: "James 5:16" },
  { day: 163, season: "Community & Forgiveness",          theme: "Overcome Evil with Good",           ref: "Romans 12:21" },
  { day: 164, season: "Community & Forgiveness",          theme: "Love Your Enemies",                 ref: "Matthew 5:44" },
  { day: 165, season: "Community & Forgiveness",          theme: "Compassion for Others",             ref: "Luke 6:36" },
  { day: 166, season: "Community & Forgiveness",          theme: "Pursue Peace",                      ref: "Hebrews 12:14" },
  { day: 167, season: "Community & Forgiveness",          theme: "One Body in Christ",                ref: "1 Corinthians 12:27" },
  { day: 168, season: "Community & Forgiveness (Sabbath)",theme: "Perfect Unity",                     ref: "Colossians 3:14" },

  // TRANSFORMATION & NEW BEGINNINGS (Days 169–180)
  { day: 169, season: "Transformation & New Beginnings",  theme: "Renew Your Mind",                   ref: "Romans 12:2" },
  { day: 170, season: "Transformation & New Beginnings",  theme: "Transformed by Glory",              ref: "2 Corinthians 3:18" },
  { day: 171, season: "Transformation & New Beginnings",  theme: "New Heart, New Spirit",             ref: "Ezekiel 36:26" },
  { day: 172, season: "Transformation & New Beginnings",  theme: "Walk by the Spirit",                ref: "Galatians 5:25" },
  { day: 173, season: "Transformation & New Beginnings",  theme: "Put on the New Self",               ref: "Colossians 3:10" },
  { day: 174, season: "Transformation & New Beginnings",  theme: "Forget What Is Behind",             ref: "Philippians 3:13-14" },
  { day: 175, season: "Transformation & New Beginnings (Sabbath)", theme: "Goodness and Mercy Follow",ref: "Psalm 23:6" },
  { day: 176, season: "Transformation & New Beginnings",  theme: "New Heavens and New Earth",         ref: "Isaiah 65:17" },
  { day: 177, season: "Transformation & New Beginnings",  theme: "Remain in the Vine",                ref: "John 15:5" },
  { day: 178, season: "Transformation & New Beginnings",  theme: "Fruit of the Spirit",               ref: "Galatians 5:22-23" },
  { day: 179, season: "Transformation & New Beginnings",  theme: "Finish the Race Faithfully",        ref: "2 Timothy 4:7" },
  { day: 180, season: "Transformation & New Beginnings",  theme: "New Creation Life",                 ref: "Revelation 21:5" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

/** Convert "1 John 4:19" → "1+john+4:19" for bible-api.com */
function refToUrl(ref) {
  return encodeURIComponent(ref.toLowerCase().replace(/\s+/g, "+"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchVerse(ref) {
  const url = `https://bible-api.com/${refToUrl(ref)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return `[FETCH ERROR ${res.status}]`;
    const data = await res.json();
    // Join multiple verses into one string, clean up whitespace
    const text = (data.text || "")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return text || "[NO TEXT RETURNED]";
  } catch (err) {
    return `[ERROR: ${err.message}]`;
  }
}

/** Wrap a value in CSV-safe double quotes */
function csvCell(val) {
  return `"${String(val).replace(/"/g, '""')}"`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log("Shepherd's Path — Fetching 180 verses from bible-api.com...\n");

const rows = [];

for (const entry of DAYS) {
  const date = formatDate(addDays(START_DATE, entry.day - 1));
  process.stdout.write(`Day ${String(entry.day).padStart(3, " ")} | ${entry.ref.padEnd(30)} `);

  const text = await fetchVerse(entry.ref);
  const ok = !text.startsWith("[");
  console.log(ok ? "✓" : text);

  rows.push({
    date,
    verseText: text,
    reference: entry.ref,
    season: entry.season,
    theme: entry.theme,
    encouragement: "",      // Column F — fill in later
    reflectionPrompt: "",   // Column G — fill in later
  });

  // Be polite to the free API — delay between requests to avoid rate limiting
  await sleep(800);
}

// ─── Write CSV ────────────────────────────────────────────────────────────────

const header = ["Date (A)", "Verse Text (B)", "Reference (C)", "Season", "Theme", "Encouragement (F)", "Reflection Prompt (G)"];
const csvLines = [
  header.map(csvCell).join(","),
  ...rows.map((r) =>
    [r.date, r.verseText, r.reference, r.season, r.theme, r.encouragement, r.reflectionPrompt]
      .map(csvCell)
      .join(",")
  ),
];

const outPath = new URL("./verses-output.csv", import.meta.url).pathname;
writeFileSync(outPath, csvLines.join("\n"), "utf8");

console.log(`\n✅ Done. CSV saved to: scripts/verses-output.csv`);
console.log(`   Open it in Excel or Google Sheets to review, then paste columns A–C and F–G into your Google Sheet.`);
