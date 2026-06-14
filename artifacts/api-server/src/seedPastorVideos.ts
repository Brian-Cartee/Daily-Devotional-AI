/**
 * Seed curated pastor video recommendations.
 * Run: cd artifacts/api-server && pnpm exec tsx src/seedPastorVideos.ts
 */
import { db } from "./db";
import { pastorVideos, type InsertPastorVideo } from "@workspace/db";
import { sql } from "drizzle-orm";

const SEED: InsertPastorVideo[] = [
  {
    pastorName: "Tony Evans",
    churchName: "The Urban Alternative",
    tier: 1,
    title: "How the Enemy Tries to Distract You From God's Plan",
    youtubeUrl: "https://youtu.be/8Q42znK2UuM",
    toneTags: ["strength", "perseverance", "spiritual battle"],
    displayOrder: 1,
  },
  {
    pastorName: "Tony Evans",
    churchName: "The Urban Alternative",
    tier: 1,
    title: "How to Get Your Prayers Answered",
    youtubeUrl: "https://youtu.be/3rXDRl1dQeU",
    toneTags: ["hope", "prayer", "presence"],
    displayOrder: 2,
  },
  {
    pastorName: "Tony Evans",
    churchName: "The Urban Alternative",
    tier: 1,
    title: "Trusting God and Taking a Risky Step of Faith",
    youtubeUrl: "https://youtu.be/2dQZj99IGm4",
    toneTags: ["hope", "faith", "encouragement", "trust"],
    displayOrder: 3,
  },
  {
    pastorName: "Phillip Anthony Mitchell",
    churchName: "2819 Church",
    tier: 1,
    title: "Deal Aggressively With This",
    youtubeUrl: "https://youtu.be/ApJSaUfRPgk",
    toneTags: ["strength", "perseverance", "spiritual battle"],
    displayOrder: 1,
  },
  {
    pastorName: "Phillip Anthony Mitchell",
    churchName: "2819 Church",
    tier: 1,
    title: "Fruit And Faith",
    youtubeUrl: "https://youtu.be/M8aV4sMs82Y",
    toneTags: ["hope", "encouragement", "faith", "growth"],
    displayOrder: 2,
  },
  {
    pastorName: "Phillip Anthony Mitchell",
    churchName: "2819 Church",
    tier: 1,
    title: "What Do I Still Lack?",
    youtubeUrl: "https://youtu.be/ui-U8CoWDRQ",
    toneTags: ["identity", "worth", "seeking", "purpose"],
    displayOrder: 3,
  },
  {
    pastorName: "Phillip Anthony Mitchell",
    churchName: "2819 Church",
    tier: 1,
    title: "Do Not Worry",
    youtubeUrl: "https://youtu.be/GpOLhGFdquU",
    toneTags: ["anxiety", "doubt", "worry", "trust", "faith"],
    displayOrder: 4,
  },
  {
    pastorName: "Jack Hibbs",
    churchName: "Real Life with Jack Hibbs",
    tier: 1,
    title: "Did God Pick You?",
    youtubeUrl: "https://youtu.be/EOvhUWPT32w",
    toneTags: ["identity", "worth", "chosen", "belonging"],
    displayOrder: 1,
  },
  {
    pastorName: "Jack Hibbs",
    churchName: "Real Life with Jack Hibbs",
    tier: 1,
    title: "The Holy Spirit In The Life of the Believer",
    youtubeUrl: "https://youtu.be/Mej26GcJFjM",
    toneTags: ["presence", "comfort", "not alone", "spirit"],
    displayOrder: 2,
  },
  {
    pastorName: "Jack Hibbs",
    churchName: "Real Life with Jack Hibbs",
    tier: 1,
    title: "Did You Disqualify Yourself From God's Plan?",
    youtubeUrl: "https://youtu.be/rAq_9WyTf1I",
    toneTags: ["hope", "grace", "identity", "shame", "worth"],
    displayOrder: 3,
  },
  {
    pastorName: "Allen Jackson",
    churchName: "Allen Jackson Ministries",
    tier: 1,
    title: "How My Mother's Faith Changed a Generation",
    youtubeUrl: "https://youtu.be/2j0Fb5UzrQM",
    toneTags: ["hope", "encouragement", "faith", "legacy"],
    displayOrder: 1,
  },
  {
    pastorName: "Allen Jackson",
    churchName: "Allen Jackson Ministries",
    tier: 1,
    title: "My Father's Journey of Faith",
    youtubeUrl: "https://youtu.be/Kp3qsP9QVVM",
    toneTags: ["hope", "faith", "encouragement", "trust"],
    displayOrder: 2,
  },
  {
    pastorName: "Allen Jackson",
    churchName: "Allen Jackson Ministries",
    tier: 1,
    title: "Alone & Waiting",
    youtubeUrl: "https://youtu.be/YkWF5nFTVW4",
    toneTags: ["presence", "not alone", "loneliness", "waiting"],
    displayOrder: 3,
  },
  {
    pastorName: "Dharius Daniels",
    churchName: "Change Church",
    tier: 1,
    title: "5 Types Of People You Can't Help",
    youtubeUrl: "https://youtu.be/gyhBCPM5X0Y",
    toneTags: ["identity", "relationships", "boundaries", "worth"],
    displayOrder: 1,
  },
  {
    pastorName: "Dharius Daniels",
    churchName: "Change Church",
    tier: 1,
    title: "I Think I'm About To Break — Managing Meltdowns Part 1",
    youtubeUrl: "https://youtu.be/c1zygb1yzPE",
    toneTags: ["grief", "overwhelm", "anxiety", "breaking point"],
    displayOrder: 2,
  },
  {
    pastorName: "Dharius Daniels",
    churchName: "Change Church",
    tier: 1,
    title: "The Enemy Is After Your Consistency",
    youtubeUrl: "https://youtu.be/WqEHZeaPFxY",
    toneTags: ["strength", "perseverance", "spiritual battle", "consistency"],
    displayOrder: 3,
  },
  {
    pastorName: "Jentezen Franklin",
    churchName: "Free Chapel",
    tier: 2,
    title: "God Uses Life's Bruises",
    youtubeUrl: "https://youtu.be/iZuizV1jtQk",
    toneTags: ["grief", "healing", "pain", "suffering", "loss"],
    displayOrder: 1,
  },
  {
    pastorName: "Jentezen Franklin",
    churchName: "Free Chapel",
    tier: 2,
    title: "Right People, Right Place, Right Plan",
    youtubeUrl: "https://youtu.be/q2UsWHA0nDE",
    toneTags: ["hope", "encouragement", "direction", "purpose"],
    displayOrder: 2,
  },
  {
    pastorName: "Jentezen Franklin",
    churchName: "Free Chapel",
    tier: 2,
    title: "If You Feel Stuck In The Waiting",
    youtubeUrl: "https://youtu.be/pJhWKzplUTU",
    toneTags: ["presence", "not alone", "waiting", "patience", "loneliness"],
    displayOrder: 3,
  },
  {
    pastorName: "T.D. Jakes",
    churchName: "The Potter's House",
    tier: 2,
    title: "Timing Is Everything",
    youtubeUrl: "https://youtu.be/HrwtRU1vMC4",
    toneTags: ["hope", "strength", "trust", "timing", "patience"],
    displayOrder: 1,
  },
  {
    pastorName: "T.D. Jakes",
    churchName: "The Potter's House",
    tier: 2,
    title: "Delayed Gratification",
    youtubeUrl: "https://youtu.be/x7TH9yTLpS0",
    toneTags: ["strength", "perseverance", "waiting", "patience", "trust"],
    displayOrder: 2,
  },
  {
    pastorName: "T.D. Jakes",
    churchName: "The Potter's House",
    tier: 2,
    title: "Recognizing God's Answer",
    youtubeUrl: "https://youtu.be/Y3GQuY0WvCM",
    toneTags: ["hope", "presence", "guidance", "prayer", "trust"],
    displayOrder: 3,
  },
  {
    pastorName: "T.D. Jakes",
    churchName: "The Potter's House",
    tier: 2,
    title: "Heart Full of Grief and a Horn Full of Oil!",
    youtubeUrl: "https://youtu.be/-eoW6hRno4A",
    toneTags: ["grief", "healing", "loss", "pain", "hope"],
    displayOrder: 4,
  },
  {
    pastorName: "Bryce Crawford",
    churchName: "The Bryce Crawford Podcast",
    tier: 2,
    title: "The Power of Prayer",
    youtubeUrl: "https://youtu.be/E0sAGM63JoI",
    toneTags: ["prayer", "hope", "faith", "presence"],
    displayOrder: 1,
  },
];

async function main() {
  await db.delete(pastorVideos);
  await db.insert(pastorVideos).values(SEED);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pastorVideos);
  console.log(`Seeded ${count} pastor videos.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
