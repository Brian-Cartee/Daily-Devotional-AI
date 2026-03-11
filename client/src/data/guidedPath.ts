export interface GuidedChapter {
  id: string;
  order: number;
  theme: string;
  title: string;
  reference: string;
  apiRef: string;
  summary: string;
  whyItMatters: string;
}

export const GUIDED_PATH: GuidedChapter[] = [
  {
    id: "creation",
    order: 1,
    theme: "The Beginning",
    title: "Creation",
    reference: "Genesis 1–2",
    apiRef: "genesis 1",
    summary: "God speaks the universe into existence in six days, creating light, sky, land, sea, and every living creature. On the sixth day, he forms humanity in his own image.",
    whyItMatters: "This passage answers the deepest question: where did everything come from? It establishes that life has meaning, humans have inherent dignity, and the world is fundamentally good."
  },
  {
    id: "fall",
    order: 2,
    theme: "The Beginning",
    title: "The Fall",
    reference: "Genesis 3",
    apiRef: "genesis 3",
    summary: "Adam and Eve disobey God by eating the forbidden fruit. Sin and death enter the world, relationships are fractured, and humanity is separated from God — but a promise of redemption is planted.",
    whyItMatters: "This chapter explains why the world is broken and why we often feel an ache for something more. It also contains the first hint of a coming savior who will crush the serpent."
  },
  {
    id: "abraham",
    order: 3,
    theme: "The Covenant",
    title: "God's Call to Abraham",
    reference: "Genesis 12",
    apiRef: "genesis 12",
    summary: "God calls Abram to leave everything and go to an unknown land. God promises to make him into a great nation and that through him all peoples of the earth will be blessed.",
    whyItMatters: "This is the beginning of God's rescue plan. The promise to Abraham is the seed from which all of Scripture grows — and it ultimately points to Jesus."
  },
  {
    id: "isaac",
    order: 4,
    theme: "The Covenant",
    title: "The Testing of Abraham",
    reference: "Genesis 22",
    apiRef: "genesis 22",
    summary: "God asks Abraham to sacrifice his only son Isaac. Abraham obeys, and at the last moment God provides a ram as a substitute. It is the most agonizing — and most hope-filled — story in Genesis.",
    whyItMatters: "This story foreshadows the cross with striking precision: a beloved son, a sacrificial substitute, and a God who provides what He requires. It has echoed through Christian theology ever since."
  },
  {
    id: "exodus",
    order: 5,
    theme: "Rescue",
    title: "The Exodus",
    reference: "Exodus 14",
    apiRef: "exodus 14",
    summary: "Moses leads the Israelites out of slavery in Egypt. Cornered at the Red Sea with Pharaoh's army approaching, God parts the waters and brings His people safely through.",
    whyItMatters: "The Exodus is the defining rescue story of the Old Testament. It shows that God hears the cries of the oppressed, acts with power, and brings His people to freedom."
  },
  {
    id: "commandments",
    order: 6,
    theme: "The Law",
    title: "The Ten Commandments",
    reference: "Exodus 20",
    apiRef: "exodus 20",
    summary: "At Mount Sinai, God gives Israel the Ten Commandments — instructions for how a redeemed people should live: loving God above all else, and treating one another with justice and care.",
    whyItMatters: "The Law isn't a ticket to earn God's favor — He already rescued Israel before giving it. It shows what a flourishing life looks like and how deeply our hearts fall short of it, pointing us to our need for grace."
  },
  {
    id: "joshua",
    order: 7,
    theme: "The Promise",
    title: "Be Strong and Courageous",
    reference: "Joshua 1",
    apiRef: "joshua 1",
    summary: "After Moses dies, Joshua is called to lead Israel into the Promised Land. God appears to him and repeats the command three times: be strong and courageous, for I am with you wherever you go.",
    whyItMatters: "Every generation faces its own 'Jordan River' — a threshold that requires courage. This passage speaks to anyone stepping into the unknown and reminds us that the same God who went before Israel goes before us."
  },
  {
    id: "ruth",
    order: 8,
    theme: "Faithfulness",
    title: "Where You Go, I Will Go",
    reference: "Ruth 1",
    apiRef: "ruth 1",
    summary: "After losing her husband, a foreign woman named Ruth refuses to abandon her mother-in-law Naomi. She makes a stunning declaration of loyalty: 'Where you go I will go. Your people will be my people and your God my God.'",
    whyItMatters: "Ruth's covenant love is one of the most beautiful pictures of hesed — faithful, loyal, self-giving love — in the Bible. It also shows that God's story was always bigger than one nation."
  },
  {
    id: "david-goliath",
    order: 9,
    theme: "David",
    title: "David and Goliath",
    reference: "1 Samuel 17",
    apiRef: "1 samuel 17",
    summary: "A giant warrior named Goliath taunts Israel for forty days. A teenage shepherd named David steps forward, refusing to wear armor. Armed with a sling and five stones, he faces the giant — and wins.",
    whyItMatters: "David's victory isn't about human heroism — it's about trusting that the battle belongs to God. The story anticipates Jesus: the unlikely, underestimated champion who defeats the enemy no one else could face."
  },
  {
    id: "psalm23",
    order: 10,
    theme: "Worship & Wisdom",
    title: "The Lord Is My Shepherd",
    reference: "Psalm 23",
    apiRef: "psalm 23",
    summary: "David writes one of the most beloved poems in human history — a meditation on God as a shepherd who provides, restores, guides, and comforts even in the darkest valleys.",
    whyItMatters: "This psalm has comforted people in grief, fear, and uncertainty for thousands of years. It captures the intimacy of a relationship with God in language that anyone can feel."
  },
  {
    id: "proverbs3",
    order: 11,
    theme: "Worship & Wisdom",
    title: "Trust in the Lord",
    reference: "Proverbs 3",
    apiRef: "proverbs 3",
    summary: "Solomon teaches the path to a wise life — trusting God with your whole heart, honoring Him, and not leaning on your own understanding. Wisdom is portrayed as more valuable than silver or gold.",
    whyItMatters: "Wisdom literature shows that faith isn't just about belief — it shapes how we live, work, speak, and treat others. This chapter distills timeless principles for a life well-lived."
  },
  {
    id: "isaiah53",
    order: 12,
    theme: "The Promise",
    title: "The Suffering Servant",
    reference: "Isaiah 53",
    apiRef: "isaiah 53",
    summary: "Isaiah, writing 700 years before Jesus, describes a servant who would be despised and rejected, pierced for our transgressions, and whose suffering would bring healing to others.",
    whyItMatters: "This is one of the most remarkable prophecies in the Bible. Christians see it as a precise picture of Jesus — making it a bridge between the Old and New Testaments."
  },
  {
    id: "jeremiah31",
    order: 13,
    theme: "The Promise",
    title: "The New Covenant",
    reference: "Jeremiah 31",
    apiRef: "jeremiah 31",
    summary: "God speaks to exiled Israel with stunning tenderness: the days are coming when I will make a new covenant — not written on stone, but on human hearts. I will forgive their wickedness and remember their sin no more.",
    whyItMatters: "Written during Israel's darkest hour, this passage promises that the problem between God and humanity will be solved from the inside out. Jesus quotes this passage at the Last Supper when He holds up the cup."
  },
  {
    id: "john1",
    order: 14,
    theme: "Jesus",
    title: "The Word Became Flesh",
    reference: "John 1",
    apiRef: "john 1",
    summary: "John opens his Gospel in the same way Genesis opens the Bible: 'In the beginning.' He declares that Jesus is the eternal Word of God who created all things and stepped into human history.",
    whyItMatters: "John's prologue is the theological foundation for understanding who Jesus is — not merely a good teacher, but God Himself entering the human story to bring light into darkness."
  },
  {
    id: "luke4",
    order: 15,
    theme: "Jesus",
    title: "The Spirit of the Lord Is on Me",
    reference: "Luke 4",
    apiRef: "luke 4",
    summary: "Jesus returns from the wilderness and enters the synagogue in Nazareth. He reads from Isaiah 61 — 'The Spirit of the Lord is on me, to proclaim good news to the poor' — then says, 'Today this scripture is fulfilled in your hearing.'",
    whyItMatters: "This is Jesus's mission statement. He comes not for the powerful but for the poor, the prisoner, the broken. Understanding His purpose changes how we see everything else He does."
  },
  {
    id: "john3",
    order: 16,
    theme: "Jesus",
    title: "Born Again",
    reference: "John 3",
    apiRef: "john 3",
    summary: "Jesus tells Nicodemus that to see the Kingdom of God, a person must be born again. The chapter contains the most quoted verse in the Bible: 'For God so loved the world...'",
    whyItMatters: "This conversation answers how a person enters a relationship with God. It reveals the heart of the gospel — that God's motive is love, and His offer is eternal life through faith."
  },
  {
    id: "matthew5",
    order: 17,
    theme: "Jesus",
    title: "The Sermon on the Mount",
    reference: "Matthew 5",
    apiRef: "matthew 5",
    summary: "Jesus delivers His most famous teaching to the crowds. He redefines what it means to be blessed, talks about salt and light, and calls His followers to a higher standard of love and integrity.",
    whyItMatters: "The Sermon on the Mount is the clearest picture of what life in God's Kingdom looks like. It challenges comfortable religion and calls people to a transformed inner life."
  },
  {
    id: "john10",
    order: 18,
    theme: "Jesus",
    title: "The Good Shepherd",
    reference: "John 10",
    apiRef: "john 10",
    summary: "Jesus declares 'I am the good shepherd' — the one who knows His sheep by name, leads them, and lays down His life for them. He contrasts Himself with hired hands who abandon the flock when danger comes.",
    whyItMatters: "Echoing Psalm 23, this passage reveals the heart of Jesus: not a distant ruler but a shepherd who goes out searching, who knows each person individually, and who gives His life rather than losing one."
  },
  {
    id: "luke15",
    order: 19,
    theme: "Jesus",
    title: "The Prodigal Son",
    reference: "Luke 15",
    apiRef: "luke 15",
    summary: "Jesus tells three parables about lost things — a lost sheep, a lost coin, and a lost son. A young man squanders his inheritance but comes home to a father who runs to meet him.",
    whyItMatters: "This is the most powerful story of grace in the Bible. The running father is a picture of how God responds to those who return to Him — not with judgment, but with overwhelming love."
  },
  {
    id: "john13",
    order: 20,
    theme: "Jesus",
    title: "Love One Another",
    reference: "John 13",
    apiRef: "john 13",
    summary: "At the Last Supper, Jesus kneels down and washes His disciples' feet — the task of the lowest servant. Then He gives a new command: love one another as I have loved you.",
    whyItMatters: "The night before His death, Jesus defines greatness as service. This single act and command reoriented the entire Christian community around a love that goes to the floor — and to the cross."
  },
  {
    id: "john11",
    order: 21,
    theme: "Jesus",
    title: "I Am the Resurrection",
    reference: "John 11",
    apiRef: "john 11",
    summary: "Jesus raises His friend Lazarus from the dead after four days in the tomb. He declares 'I am the resurrection and the life' — making His most stunning claim before the crucifixion.",
    whyItMatters: "This miracle sets the stage for everything that follows. Jesus demonstrates His power over death and foreshadows His own resurrection — the event that changes everything."
  },
  {
    id: "john19-20",
    order: 22,
    theme: "The Cross & Resurrection",
    title: "The Crucifixion & Resurrection",
    reference: "John 19–20",
    apiRef: "john 19",
    summary: "Jesus is crucified and buried, and on the third day the tomb is empty. Mary Magdalene sees Him first, and He appears to the disciples, showing them His hands and side.",
    whyItMatters: "The death and resurrection of Jesus is the central event of human history in Christian faith. Without the cross, there is no forgiveness. Without the empty tomb, there is no hope."
  },
  {
    id: "acts2",
    order: 23,
    theme: "The Church",
    title: "Pentecost",
    reference: "Acts 2",
    apiRef: "acts 2",
    summary: "Fifty days after the resurrection, the Holy Spirit comes on the disciples like fire. Peter preaches and three thousand people are baptized. The early church is born.",
    whyItMatters: "Pentecost marks the birthday of the Christian church. It shows that the Spirit isn't just for special people — He is poured out on all who believe, empowering ordinary people for extraordinary things."
  },
  {
    id: "acts9",
    order: 24,
    theme: "The Church",
    title: "The Conversion of Paul",
    reference: "Acts 9",
    apiRef: "acts 9",
    summary: "Saul of Tarsus — Christianity's most dangerous persecutor — is suddenly blinded by a light on the road to Damascus. He hears the voice of Jesus, and his life is turned completely upside down.",
    whyItMatters: "Paul's conversion is the ultimate story of grace reaching the most unlikely person. If God could redeem the man who was hunting Christians, no one is beyond His reach."
  },
  {
    id: "romans8",
    order: 25,
    theme: "The Letters",
    title: "No Condemnation",
    reference: "Romans 8",
    apiRef: "romans 8",
    summary: "Paul writes that there is no condemnation for those in Christ Jesus. The Spirit brings life, adopts us as God's children, and nothing — not death, angels, or any power — can separate us from God's love.",
    whyItMatters: "Romans 8 is one of the greatest chapters in the Bible. It moves from the struggle of the sinful nature all the way to the unshakeable security of God's love. Many call it the summit of the New Testament."
  },
  {
    id: "galatians5",
    order: 26,
    theme: "The Letters",
    title: "The Fruit of the Spirit",
    reference: "Galatians 5",
    apiRef: "galatians 5",
    summary: "Paul contrasts living by our own impulses with living by the Spirit, who produces love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control in us.",
    whyItMatters: "This passage answers the question: what does a changed life actually look like? The fruit of the Spirit isn't a performance standard — it's the natural result of staying connected to the vine."
  },
  {
    id: "1cor13",
    order: 27,
    theme: "The Letters",
    title: "The Greatest of These Is Love",
    reference: "1 Corinthians 13",
    apiRef: "1 corinthians 13",
    summary: "Paul writes that spiritual gifts without love are worthless. He then describes what love actually looks like — patient, kind, not self-seeking, not easily angered, always hoping.",
    whyItMatters: "This passage reorients every definition of greatness. In a church where people were competing for status, Paul says the most powerful thing any person can be is loving."
  },
  {
    id: "eph2",
    order: 28,
    theme: "The Letters",
    title: "Saved by Grace",
    reference: "Ephesians 2",
    apiRef: "ephesians 2",
    summary: "Paul describes the transformation of a life changed by God's grace. Once dead in sin, now made alive with Christ. Salvation is not earned — it is a gift, so that no one can boast.",
    whyItMatters: "Ephesians 2 is the clearest statement of the gospel in Paul's letters. It answers the question 'how can I be right with God?' with two words: through grace."
  },
  {
    id: "hebrews11",
    order: 29,
    theme: "The Letters",
    title: "The Hall of Faith",
    reference: "Hebrews 11",
    apiRef: "hebrews 11",
    summary: "The writer of Hebrews defines faith as 'confidence in what we hope for, assurance about what we do not see,' then rolls through the whole Old Testament: Abel, Noah, Abraham, Moses, and more — all of whom acted on faith.",
    whyItMatters: "This chapter connects every reader to a vast community of people who trusted God without seeing the full picture. We are invited to join them — part of a story much larger than our own."
  },
  {
    id: "revelation21",
    order: 30,
    theme: "The End & the New Beginning",
    title: "All Things New",
    reference: "Revelation 21",
    apiRef: "revelation 21",
    summary: "John sees a vision of a new heaven and a new earth. God makes His home among humanity, wiping every tear from their eyes. There is no more death, mourning, crying, or pain.",
    whyItMatters: "The Bible ends where it began — with God and humanity together, with everything made right. This final chapter gives the Christian story its ultimate destination and deepest hope."
  }
];
