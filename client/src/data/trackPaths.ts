export type TrackId = "psalms" | "proverbs" | "gospel" | "wisdom";

export interface TrackPassage {
  reference: string;
  apiRef: string;
  title: string;
}

export interface Track {
  id: TrackId;
  name: string;
  description: string;
  icon: string;
  accent: string;
  passages: TrackPassage[];
}

export const TRACKS: Track[] = [
  {
    id: "psalms",
    name: "Psalms",
    description: "Songs of lament, praise, and trust",
    icon: "🎵",
    accent: "text-amber-600",
    passages: [
      { reference: "Psalm 1", apiRef: "psalm 1", title: "The Blessed Life" },
      { reference: "Psalm 8", apiRef: "psalm 8", title: "The Glory of God" },
      { reference: "Psalm 15", apiRef: "psalm 15", title: "Who May Dwell with God?" },
      { reference: "Psalm 19", apiRef: "psalm 19", title: "The Heavens Declare" },
      { reference: "Psalm 22", apiRef: "psalm 22", title: "My God, My God" },
      { reference: "Psalm 23", apiRef: "psalm 23", title: "The Lord Is My Shepherd" },
      { reference: "Psalm 24", apiRef: "psalm 24", title: "The King of Glory" },
      { reference: "Psalm 27", apiRef: "psalm 27", title: "The Lord Is My Light" },
      { reference: "Psalm 32", apiRef: "psalm 32", title: "Blessed Is the Forgiven" },
      { reference: "Psalm 34", apiRef: "psalm 34", title: "Taste and See" },
      { reference: "Psalm 37", apiRef: "psalm 37", title: "Do Not Fret" },
      { reference: "Psalm 42", apiRef: "psalm 42", title: "As the Deer Pants" },
      { reference: "Psalm 46", apiRef: "psalm 46", title: "God Is Our Refuge" },
      { reference: "Psalm 51", apiRef: "psalm 51", title: "A Prayer of Repentance" },
      { reference: "Psalm 62", apiRef: "psalm 62", title: "Rest in God Alone" },
      { reference: "Psalm 63", apiRef: "psalm 63", title: "Thirsting for God" },
      { reference: "Psalm 84", apiRef: "psalm 84", title: "How Lovely Is Your Dwelling" },
      { reference: "Psalm 90", apiRef: "psalm 90", title: "Teach Us to Number Our Days" },
      { reference: "Psalm 91", apiRef: "psalm 91", title: "In the Shadow of the Almighty" },
      { reference: "Psalm 95", apiRef: "psalm 95", title: "A Call to Worship" },
      { reference: "Psalm 96", apiRef: "psalm 96", title: "Sing to the Lord" },
      { reference: "Psalm 100", apiRef: "psalm 100", title: "Enter His Gates with Praise" },
      { reference: "Psalm 103", apiRef: "psalm 103", title: "Bless the Lord, O My Soul" },
      { reference: "Psalm 104", apiRef: "psalm 104", title: "Lord of Creation" },
      { reference: "Psalm 121", apiRef: "psalm 121", title: "My Help Comes from the Lord" },
      { reference: "Psalm 130", apiRef: "psalm 130", title: "Out of the Depths" },
      { reference: "Psalm 139", apiRef: "psalm 139", title: "You Have Searched Me and Known Me" },
      { reference: "Psalm 145", apiRef: "psalm 145", title: "God's Greatness and Goodness" },
      { reference: "Psalm 150", apiRef: "psalm 150", title: "Let Everything Praise the Lord" },
    ],
  },
  {
    id: "proverbs",
    name: "Proverbs",
    description: "Ancient wisdom for daily decisions",
    icon: "💡",
    accent: "text-yellow-600",
    passages: [
      { reference: "Proverbs 1", apiRef: "proverbs 1", title: "The Beginning of Wisdom" },
      { reference: "Proverbs 2", apiRef: "proverbs 2", title: "Seek Wisdom Like Silver" },
      { reference: "Proverbs 3", apiRef: "proverbs 3", title: "Trust in the Lord" },
      { reference: "Proverbs 4", apiRef: "proverbs 4", title: "Guard Your Heart" },
      { reference: "Proverbs 6", apiRef: "proverbs 6", title: "Warnings Against Folly" },
      { reference: "Proverbs 8", apiRef: "proverbs 8", title: "Wisdom's Call" },
      { reference: "Proverbs 9", apiRef: "proverbs 9", title: "Wisdom's Feast" },
      { reference: "Proverbs 10", apiRef: "proverbs 10", title: "Contrasts of Character" },
      { reference: "Proverbs 11", apiRef: "proverbs 11", title: "Integrity and Honor" },
      { reference: "Proverbs 12", apiRef: "proverbs 12", title: "The Righteous Life" },
      { reference: "Proverbs 13", apiRef: "proverbs 13", title: "Discipline and Wealth" },
      { reference: "Proverbs 14", apiRef: "proverbs 14", title: "Words and Their Weight" },
      { reference: "Proverbs 15", apiRef: "proverbs 15", title: "A Gentle Answer" },
      { reference: "Proverbs 16", apiRef: "proverbs 16", title: "Plans and Providence" },
      { reference: "Proverbs 17", apiRef: "proverbs 17", title: "A Friend Who Loves" },
      { reference: "Proverbs 18", apiRef: "proverbs 18", title: "The Power of Words" },
      { reference: "Proverbs 19", apiRef: "proverbs 19", title: "Patience and Prudence" },
      { reference: "Proverbs 20", apiRef: "proverbs 20", title: "The Lamp of the Lord" },
      { reference: "Proverbs 21", apiRef: "proverbs 21", title: "The King's Heart" },
      { reference: "Proverbs 22", apiRef: "proverbs 22", title: "A Good Name" },
      { reference: "Proverbs 23", apiRef: "proverbs 23", title: "What to Aim For" },
      { reference: "Proverbs 24", apiRef: "proverbs 24", title: "Wisdom in Hard Times" },
      { reference: "Proverbs 25", apiRef: "proverbs 25", title: "Words Like Gold" },
      { reference: "Proverbs 27", apiRef: "proverbs 27", title: "Faithful Wounds" },
      { reference: "Proverbs 28", apiRef: "proverbs 28", title: "The Upright Will Flourish" },
      { reference: "Proverbs 29", apiRef: "proverbs 29", title: "Correction and Vision" },
      { reference: "Proverbs 30", apiRef: "proverbs 30", title: "Words of Agur" },
      { reference: "Proverbs 31", apiRef: "proverbs 31", title: "The Noble Life" },
    ],
  },
  {
    id: "gospel",
    name: "Gospel",
    description: "The life of Jesus through Luke's eyes",
    icon: "✝️",
    accent: "text-indigo-600",
    passages: [
      { reference: "Luke 1", apiRef: "luke 1", title: "The Promise" },
      { reference: "Luke 2", apiRef: "luke 2", title: "The Birth of Jesus" },
      { reference: "Luke 3", apiRef: "luke 3", title: "Prepare the Way" },
      { reference: "Luke 4", apiRef: "luke 4", title: "Temptation and Ministry Begin" },
      { reference: "Luke 5", apiRef: "luke 5", title: "Follow Me" },
      { reference: "Luke 6", apiRef: "luke 6", title: "The Sermon on the Plain" },
      { reference: "Luke 7", apiRef: "luke 7", title: "The Faith That Amazes" },
      { reference: "Luke 8", apiRef: "luke 8", title: "Seeds and Storms" },
      { reference: "Luke 9", apiRef: "luke 9", title: "Who Is Jesus?" },
      { reference: "Luke 10", apiRef: "luke 10", title: "The Good Samaritan" },
      { reference: "Luke 11", apiRef: "luke 11", title: "Teach Us to Pray" },
      { reference: "Luke 12", apiRef: "luke 12", title: "Do Not Be Afraid" },
      { reference: "Luke 13", apiRef: "luke 13", title: "The Narrow Door" },
      { reference: "Luke 14", apiRef: "luke 14", title: "The Great Banquet" },
      { reference: "Luke 15", apiRef: "luke 15", title: "Lost and Found" },
      { reference: "Luke 16", apiRef: "luke 16", title: "Two Masters" },
      { reference: "Luke 17", apiRef: "luke 17", title: "Faith Like a Mustard Seed" },
      { reference: "Luke 18", apiRef: "luke 18", title: "Persistent Prayer" },
      { reference: "Luke 19", apiRef: "luke 19", title: "Zacchaeus and the Entry" },
      { reference: "Luke 20", apiRef: "luke 20", title: "Questions and Authority" },
      { reference: "Luke 21", apiRef: "luke 21", title: "Signs of the End" },
      { reference: "Luke 22", apiRef: "luke 22", title: "The Last Supper" },
      { reference: "Luke 23", apiRef: "luke 23", title: "The Crucifixion" },
      { reference: "Luke 24", apiRef: "luke 24", title: "He Is Risen" },
      { reference: "John 1", apiRef: "john 1", title: "In the Beginning Was the Word" },
      { reference: "John 3", apiRef: "john 3", title: "Born Again" },
      { reference: "John 10", apiRef: "john 10", title: "The Good Shepherd" },
      { reference: "John 15", apiRef: "john 15", title: "Abide in Me" },
    ],
  },
  {
    id: "wisdom",
    name: "Wisdom",
    description: "Life's hard questions, honestly answered",
    icon: "📜",
    accent: "text-teal-600",
    passages: [
      { reference: "Job 1", apiRef: "job 1", title: "When Everything Falls Apart" },
      { reference: "Job 3", apiRef: "job 3", title: "The Cry of Suffering" },
      { reference: "Job 19", apiRef: "job 19", title: "My Redeemer Lives" },
      { reference: "Job 28", apiRef: "job 28", title: "Where Is Wisdom Found?" },
      { reference: "Job 38", apiRef: "job 38", title: "Where Were You?" },
      { reference: "Job 42", apiRef: "job 42", title: "Restoration" },
      { reference: "Ecclesiastes 1", apiRef: "ecclesiastes 1", title: "Vanity of Vanities" },
      { reference: "Ecclesiastes 3", apiRef: "ecclesiastes 3", title: "A Time for Everything" },
      { reference: "Ecclesiastes 5", apiRef: "ecclesiastes 5", title: "Fear God" },
      { reference: "Ecclesiastes 7", apiRef: "ecclesiastes 7", title: "The Better Thing" },
      { reference: "Ecclesiastes 9", apiRef: "ecclesiastes 9", title: "Enjoy Your Life" },
      { reference: "Ecclesiastes 11", apiRef: "ecclesiastes 11", title: "Cast Your Bread" },
      { reference: "Ecclesiastes 12", apiRef: "ecclesiastes 12", title: "Fear God and Keep His Commandments" },
      { reference: "Ruth 1", apiRef: "ruth 1", title: "Where You Go, I Will Go" },
      { reference: "Ruth 2", apiRef: "ruth 2", title: "The Kinsman Redeemer" },
      { reference: "Ruth 4", apiRef: "ruth 4", title: "Redemption and Rest" },
      { reference: "James 1", apiRef: "james 1", title: "Trials and Wisdom" },
      { reference: "James 2", apiRef: "james 2", title: "Faith and Works" },
      { reference: "James 3", apiRef: "james 3", title: "Taming the Tongue" },
      { reference: "James 4", apiRef: "james 4", title: "Humble Yourselves" },
      { reference: "James 5", apiRef: "james 5", title: "Prayer of Faith" },
      { reference: "1 Peter 1", apiRef: "1 peter 1", title: "Living Hope" },
      { reference: "1 Peter 2", apiRef: "1 peter 2", title: "A Chosen People" },
      { reference: "1 Peter 4", apiRef: "1 peter 4", title: "Stewards of Grace" },
      { reference: "1 Peter 5", apiRef: "1 peter 5", title: "Humble and Alert" },
      { reference: "Romans 8", apiRef: "romans 8", title: "No Condemnation" },
      { reference: "Romans 12", apiRef: "romans 12", title: "Living Sacrifice" },
      { reference: "Philippians 4", apiRef: "philippians 4", title: "The Peace That Passes Understanding" },
    ],
  },
];

export function getTodaysPassage(track: Track): TrackPassage {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return track.passages[dayOfYear % track.passages.length];
}

export function getPassageIndex(track: Track): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return dayOfYear % track.passages.length;
}
