import type { TriviaQuestion } from "@workspace/db";

/** Instant fallback when DB cache is empty — avoids 30s+ OpenAI wait on first play. */
export const TRIVIA_SEED: Record<string, TriviaQuestion[]> = {
  "life-of-jesus": [
    { question: "In which town was Jesus born?", options: ["Nazareth", "Bethlehem", "Jerusalem", "Capernaum"], correctIndex: 1, explanation: "Jesus was born in Bethlehem, the city of David.", verseRef: "Luke 2:4-7" },
    { question: "Who baptized Jesus in the Jordan River?", options: ["Peter", "John the Baptist", "James", "Andrew"], correctIndex: 1, explanation: "John baptized Jesus before His public ministry began.", verseRef: "Matthew 3:13-16" },
    { question: "How many disciples did Jesus choose?", options: ["7", "10", "12", "70"], correctIndex: 2, explanation: "Jesus appointed twelve apostles to be with Him and to preach.", verseRef: "Mark 3:14" },
    { question: "What miracle did Jesus perform at a wedding in Cana?", options: ["Healed a blind man", "Turned water into wine", "Fed five thousand", "Walked on water"], correctIndex: 1, explanation: "This was the first sign Jesus performed in Galilee.", verseRef: "John 2:1-11" },
    { question: "Where was Jesus crucified?", options: ["Mount Sinai", "Golgotha", "Mount of Olives", "Jericho"], correctIndex: 1, explanation: "Golgotha means 'the place of the skull.'", verseRef: "Matthew 27:33" },
    { question: "Who was the first to see the risen Jesus?", options: ["Peter", "Thomas", "Mary Magdalene", "John"], correctIndex: 2, explanation: "Mary Magdalene met the risen Lord at the tomb.", verseRef: "John 20:14-16" },
    { question: "What did Jesus feed to about five thousand men?", options: ["Fish and bread", "Manna", "Figs and honey", "Lamb and wine"], correctIndex: 0, explanation: "Five loaves and two fish fed the multitude.", verseRef: "Matthew 14:17-21" },
    { question: "Which disciple denied Jesus three times?", options: ["Judas", "Peter", "Thomas", "Philip"], correctIndex: 1, explanation: "Peter wept bitterly after denying Jesus before the rooster crowed.", verseRef: "Matthew 26:69-75" },
    { question: "On what mountain did Jesus give the Sermon on the Mount?", options: ["Mount Sinai", "Mount Carmel", "A mountainside in Galilee", "Mount Zion"], correctIndex: 2, explanation: "Jesus taught the Beatitudes and more to the crowds.", verseRef: "Matthew 5:1-2" },
    { question: "Who helped carry Jesus' cross?", options: ["Joseph of Arimathea", "Simon of Cyrene", "Nicodemus", "Barabbas"], correctIndex: 1, explanation: "Simon was compelled to carry the cross on the way to Golgotha.", verseRef: "Mark 15:21" },
    { question: "What did Jesus say is the greatest commandment?", options: ["Keep the Sabbath", "Love God with all your heart", "Give to the poor", "Pray without ceasing"], correctIndex: 1, explanation: "Loving God and neighbor sums up the Law and the Prophets.", verseRef: "Matthew 22:37-39" },
    { question: "Which Gospel records Jesus raising Lazarus from the dead?", options: ["Matthew", "Mark", "Luke", "John"], correctIndex: 3, explanation: "John 11 tells of Lazarus coming out of the tomb.", verseRef: "John 11:43-44" },
  ],
  "old-testament": [
    { question: "Who built the ark?", options: ["Abraham", "Moses", "Noah", "David"], correctIndex: 2, explanation: "Noah obeyed God and built the ark before the flood.", verseRef: "Genesis 6:14" },
    { question: "What did God give Moses on Mount Sinai?", options: ["A crown", "The Ten Commandments", "A sword", "A map of Canaan"], correctIndex: 1, explanation: "God wrote the commandments on tablets of stone.", verseRef: "Exodus 20:1-17" },
    { question: "Who was swallowed by a great fish?", options: ["Elijah", "Jonah", "Daniel", "Samson"], correctIndex: 1, explanation: "Jonah spent three days in the fish before going to Nineveh.", verseRef: "Jonah 1:17" },
    { question: "What did Joseph's brothers sell him for?", options: ["Twenty pieces of silver", "A camel", "A field in Hebron", "A golden cup"], correctIndex: 0, explanation: "Joseph was sold to Ishmaelite traders.", verseRef: "Genesis 37:28" },
    { question: "Who defeated Goliath?", options: ["Saul", "David", "Jonathan", "Samson"], correctIndex: 1, explanation: "David struck Goliath with a stone from his sling.", verseRef: "1 Samuel 17:49-50" },
    { question: "What city did Joshua's army march around?", options: ["Jerusalem", "Jericho", "Ai", "Hebron"], correctIndex: 1, explanation: "The walls fell after Israel marched and shouted.", verseRef: "Joshua 6:20" },
    { question: "Who was the first man?", options: ["Cain", "Adam", "Noah", "Enoch"], correctIndex: 1, explanation: "God formed Adam from the dust of the ground.", verseRef: "Genesis 2:7" },
    { question: "What did God create on the first day?", options: ["Animals", "Light", "Plants", "The sun"], correctIndex: 1, explanation: "God said 'Let there be light' and there was light.", verseRef: "Genesis 1:3-5" },
    { question: "Who led Israel out of Egypt?", options: ["Aaron", "Moses", "Joshua", "Caleb"], correctIndex: 1, explanation: "Moses confronted Pharaoh and parted the Red Sea.", verseRef: "Exodus 14:21" },
    { question: "What did Ruth say to Naomi?", options: ["Your people shall be my people", "I will return to Moab", "Leave me behind", "I cannot follow"], correctIndex: 0, explanation: "Ruth pledged loyalty to Naomi and her God.", verseRef: "Ruth 1:16" },
    { question: "Who interpreted dreams for Pharaoh?", options: ["Aaron", "Joseph", "Daniel", "Samuel"], correctIndex: 1, explanation: "Joseph explained the dreams of plenty and famine.", verseRef: "Genesis 41:25-36" },
    { question: "What did Solomon ask God for?", options: ["Wealth", "Victory in battle", "Wisdom", "Long life only"], correctIndex: 2, explanation: "God gave Solomon wisdom and also riches and honor.", verseRef: "1 Kings 3:9-13" },
  ],
  "new-testament": [
    { question: "Who wrote most of the New Testament letters?", options: ["Peter", "Paul", "James", "John"], correctIndex: 1, explanation: "Paul wrote many epistles to churches and leaders.", verseRef: "Romans 1:1" },
    { question: "On what day did the Holy Spirit come at Pentecost?", options: ["Day 7", "Day 40", "Day 50", "Day 100"], correctIndex: 2, explanation: "Pentecost means fiftieth day after Passover.", verseRef: "Acts 2:1-4" },
    { question: "Who betrayed Jesus for thirty pieces of silver?", options: ["Peter", "Judas Iscariot", "Thomas", "Barabbas"], correctIndex: 1, explanation: "Judas identified Jesus with a kiss in Gethsemane.", verseRef: "Matthew 26:14-16" },
    { question: "Which book tells of Paul's missionary journeys?", options: ["Romans", "Acts", "Hebrews", "Galatians"], correctIndex: 1, explanation: "Acts records the spread of the church after Jesus ascended.", verseRef: "Acts 1:8" },
    { question: "What did Jesus tell Nicodemus he must be?", options: ["Born again", "Circumcised twice", "A priest", "Rich in spirit"], correctIndex: 0, explanation: "New birth by the Spirit is necessary to see God's kingdom.", verseRef: "John 3:3-7" },
    { question: "Who was struck blind on the road to Damascus?", options: ["Peter", "Paul", "Stephen", "Barnabas"], correctIndex: 1, explanation: "Saul met the risen Christ and later became Paul.", verseRef: "Acts 9:3-9" },
    { question: "Which Gospel was written by a physician?", options: ["Matthew", "Mark", "Luke", "John"], correctIndex: 2, explanation: "Luke also wrote the book of Acts.", verseRef: "Colossians 4:14" },
    { question: "What is the last book of the New Testament?", options: ["Jude", "Revelation", "Hebrews", "3 John"], correctIndex: 1, explanation: "Revelation records visions given to John on Patmos.", verseRef: "Revelation 1:1" },
    { question: "Who was the first Christian martyr?", options: ["James", "Stephen", "Peter", "Paul"], correctIndex: 1, explanation: "Stephen was stoned while seeing heaven opened.", verseRef: "Acts 7:54-60" },
    { question: "In which city were believers first called Christians?", options: ["Jerusalem", "Antioch", "Rome", "Ephesus"], correctIndex: 1, explanation: "The disciples were first called Christians in Antioch.", verseRef: "Acts 11:26" },
    { question: "What fruit does Paul list in Galatians 5?", options: ["Works of the law", "Fruit of the Spirit", "Gifts of tongues", "Stones of the altar"], correctIndex: 1, explanation: "Love, joy, peace, and more come by the Spirit.", verseRef: "Galatians 5:22-23" },
    { question: "Who denied knowing Jesus three times before the rooster crowed?", options: ["Judas", "Peter", "John", "Thomas"], correctIndex: 1, explanation: "Peter repented and was restored by Jesus.", verseRef: "Luke 22:60-62" },
  ],
  "bible-characters": [
    { question: "Who was known for great strength and long hair?", options: ["Goliath", "Samson", "Saul", "Ehud"], correctIndex: 1, explanation: "Samson's strength was tied to his Nazirite vow.", verseRef: "Judges 16:17" },
    { question: "Who was thrown into a lions' den?", options: ["Daniel", "David", "Shadrach", "Joseph"], correctIndex: 0, explanation: "God shut the lions' mouths and Daniel was unharmed.", verseRef: "Daniel 6:22" },
    { question: "Who was the mother of Samuel?", options: ["Ruth", "Hannah", "Sarah", "Elizabeth"], correctIndex: 1, explanation: "Hannah prayed earnestly for a son and dedicated him to God.", verseRef: "1 Samuel 1:20-28" },
    { question: "Who wrestled with God and was renamed Israel?", options: ["Isaac", "Jacob", "Esau", "Joseph"], correctIndex: 1, explanation: "Jacob received a new name after wrestling at Peniel.", verseRef: "Genesis 32:28" },
    { question: "Who was a tax collector called by Jesus?", options: ["Matthew", "Mark", "Luke", "Simon Peter"], correctIndex: 0, explanation: "Matthew left his booth and followed Jesus.", verseRef: "Matthew 9:9" },
    { question: "Who was the queen who saved her people from Haman?", options: ["Ruth", "Esther", "Deborah", "Miriam"], correctIndex: 1, explanation: "Esther risked her life to approach the king.", verseRef: "Esther 4:16" },
    { question: "Who was the prophet taken up in a whirlwind?", options: ["Elisha", "Elijah", "Isaiah", "Amos"], correctIndex: 1, explanation: "Elijah went to heaven in a chariot of fire.", verseRef: "2 Kings 2:11" },
    { question: "Who was the youngest son of Jesse anointed king?", options: ["Eliab", "David", "Abinadab", "Shammah"], correctIndex: 1, explanation: "David was anointed while still a shepherd boy.", verseRef: "1 Samuel 16:13" },
    { question: "Who was the wife of Abraham?", options: ["Rachel", "Sarah", "Rebekah", "Leah"], correctIndex: 1, explanation: "Sarah bore Isaac in her old age as God promised.", verseRef: "Genesis 21:2-3" },
    { question: "Who doubted until he saw Jesus' wounds?", options: ["Peter", "Thomas", "Philip", "Andrew"], correctIndex: 1, explanation: "Thomas believed when he saw the risen Lord.", verseRef: "John 20:27-28" },
    { question: "Who led Israel after Moses died?", options: ["Caleb", "Joshua", "Aaron", "Gideon"], correctIndex: 1, explanation: "Joshua brought Israel into the promised land.", verseRef: "Joshua 1:1-2" },
    { question: "Who was the first woman created?", options: ["Eve", "Sarah", "Ruth", "Mary"], correctIndex: 0, explanation: "Eve was formed from Adam's side.", verseRef: "Genesis 2:22" },
  ],
  "psalms-wisdom": [
    { question: "Who wrote many of the Psalms?", options: ["Solomon", "David", "Moses", "Samuel"], correctIndex: 1, explanation: "David is credited with dozens of psalms.", verseRef: "Psalm 23" },
    { question: "Which book says 'The fear of the Lord is the beginning of wisdom'?", options: ["Job", "Proverbs", "Ecclesiastes", "Song of Solomon"], correctIndex: 1, explanation: "Proverbs teaches practical godly wisdom.", verseRef: "Proverbs 9:10" },
    { question: "What does Psalm 23 compare the Lord to?", options: ["A king", "A shepherd", "A warrior", "A builder"], correctIndex: 1, explanation: "The Lord shepherds, guides, and restores the soul.", verseRef: "Psalm 23:1" },
    { question: "Which wisdom book explores meaning 'under the sun'?", options: ["Proverbs", "Ecclesiastes", "Psalms", "Lamentations"], correctIndex: 1, explanation: "Ecclesiastes reflects on life apart from eternal perspective.", verseRef: "Ecclesiastes 1:2" },
    { question: "Who lost family, health, and possessions yet remained faithful?", options: ["David", "Job", "Jeremiah", "Nehemiah"], correctIndex: 1, explanation: "Job wrestled with suffering and trusted God.", verseRef: "Job 1:21-22" },
    { question: "Which psalm begins 'The Lord is my light and my salvation'?", options: ["Psalm 1", "Psalm 27", "Psalm 51", "Psalm 119"], correctIndex: 1, explanation: "David expresses confidence in God's protection.", verseRef: "Psalm 27:1" },
    { question: "Who is traditionally linked to the Song of Solomon?", options: ["David", "Solomon", "Hezekiah", "Asaph"], correctIndex: 1, explanation: "The Song celebrates love and covenant devotion.", verseRef: "Song of Solomon 1:1" },
    { question: "Which proverb warns about pride before a fall?", options: ["Proverbs 3:5", "Proverbs 16:18", "Proverbs 31:10", "Proverbs 1:7"], correctIndex: 1, explanation: "Pride goes before destruction.", verseRef: "Proverbs 16:18" },
    { question: "What is the longest chapter in the Bible?", options: ["Psalm 23", "Psalm 119", "Isaiah 53", "Matthew 5"], correctIndex: 1, explanation: "Psalm 119 is an acrostic meditation on God's law.", verseRef: "Psalm 119" },
    { question: "Which book asks 'How long, O Lord?'", options: ["Psalms", "Proverbs", "Ruth", "Ezra"], correctIndex: 0, explanation: "Many psalms cry out honestly to God in distress.", verseRef: "Psalm 13:1" },
    { question: "Who said 'Vanity of vanities, all is vanity'?", options: ["Solomon", "David", "Moses", "Isaiah"], correctIndex: 0, explanation: "The Preacher reflects on life's fleeting nature.", verseRef: "Ecclesiastes 1:2" },
    { question: "Which psalm is a prayer of repentance after sin?", options: ["Psalm 23", "Psalm 51", "Psalm 100", "Psalm 150"], correctIndex: 1, explanation: "David asks God for cleansing and a renewed spirit.", verseRef: "Psalm 51:10" },
  ],
  "books-authors": [
    { question: "Who wrote the Pentateuch traditionally?", options: ["David", "Moses", "Joshua", "Ezra"], correctIndex: 1, explanation: "Genesis through Deuteronomy are attributed to Moses.", verseRef: "Deuteronomy 31:9" },
    { question: "Which prophet wrote the book of Isaiah?", options: ["Jeremiah", "Isaiah", "Ezekiel", "Daniel"], correctIndex: 1, explanation: "Isaiah prophesied in Judah over many years.", verseRef: "Isaiah 1:1" },
    { question: "Who is the traditional author of Revelation?", options: ["Paul", "Peter", "John", "James"], correctIndex: 2, explanation: "John received visions on the island of Patmos.", verseRef: "Revelation 1:9" },
    { question: "Which Gospel emphasizes Jesus as the Son of God?", options: ["Matthew", "Mark", "Luke", "John"], correctIndex: 3, explanation: "John highlights belief and eternal life.", verseRef: "John 20:31" },
    { question: "Who wrote letters to Timothy and Titus?", options: ["Peter", "Paul", "James", "Jude"], correctIndex: 1, explanation: "Paul instructed young leaders in pastoral letters.", verseRef: "1 Timothy 1:1" },
    { question: "Which book comes last in the Old Testament?", options: ["Zechariah", "Malachi", "Haggai", "Daniel"], correctIndex: 1, explanation: "Malachi closes the Hebrew prophetic collection.", verseRef: "Malachi 4:6" },
    { question: "Who is credited with compiling many Proverbs?", options: ["David", "Solomon", "Hezekiah's men", "Both Solomon and others"], correctIndex: 3, explanation: "Proverbs names Solomon and later collectors.", verseRef: "Proverbs 1:1" },
    { question: "Which epistle emphasizes faith without works saving?", options: ["James", "Galatians", "Jude", "1 Peter"], correctIndex: 1, explanation: "Paul argues justification is by faith in Christ.", verseRef: "Galatians 2:16" },
    { question: "Who wrote the book of Acts?", options: ["Peter", "Luke", "Mark", "Matthew"], correctIndex: 1, explanation: "Luke continues his Gospel into the church's story.", verseRef: "Acts 1:1" },
    { question: "Which minor prophet preached to Nineveh?", options: ["Hosea", "Jonah", "Amos", "Micah"], correctIndex: 1, explanation: "Jonah reluctantly proclaimed God's message.", verseRef: "Jonah 3:2" },
    { question: "Who wrote Hebrews (traditionally debated)?", options: ["Paul (often attributed)", "Peter", "John the Baptist", "Timothy only"], correctIndex: 0, explanation: "The author is unknown; Paul was long suggested.", verseRef: "Hebrews 13:22" },
    { question: "How many books are in the Protestant Bible?", options: ["39", "66", "73", "27"], correctIndex: 1, explanation: "39 Old Testament and 27 New Testament books.", verseRef: "Canon" },
  ],
};

/** Harder seed set for challenging mode. */
export const TRIVIA_SEED_CHALLENGING: Record<string, TriviaQuestion[]> = {
  "life-of-jesus": [
    { question: "How many years did Jesus live before the crucifixion (approx.)?", options: ["About 25", "About 33", "About 40", "About 50"], correctIndex: 1, explanation: "Tradition places Jesus' ministry around age 30–33.", verseRef: "Luke 3:23" },
    { question: "Which Roman governor sentenced Jesus to death?", options: ["Herod Antipas", "Pontius Pilate", "Caesar Augustus", "Felix"], correctIndex: 1, explanation: "Pilate washed his hands before the crowd.", verseRef: "Matthew 27:24" },
    { question: "How many days was Jesus in the tomb before resurrection?", options: ["One", "Two", "Three", "Seven"], correctIndex: 2, explanation: "Jesus rose on the third day as He foretold.", verseRef: "Matthew 12:40" },
    { question: "Which disciple asked to sit at Jesus' right and left in glory?", options: ["Peter and Andrew", "James and John", "Philip and Bartholomew", "Thomas and Matthew"], correctIndex: 1, explanation: "Their mother also asked on their behalf.", verseRef: "Mark 10:37" },
    { question: "In which garden was Jesus arrested?", options: ["Gethsemane", "Eden", "Olivet", "En Gedi"], correctIndex: 0, explanation: "Jesus prayed in Gethsemane before betrayal.", verseRef: "Matthew 26:36" },
    { question: "How many lepers returned to thank Jesus in Luke 17?", options: ["All ten", "One", "Five", "None"], correctIndex: 1, explanation: "Only one Samaritan returned giving praise.", verseRef: "Luke 17:15-16" },
    { question: "Which Old Testament figure appeared with Jesus at the Transfiguration?", options: ["Abraham only", "Moses and Elijah", "David and Solomon", "Isaiah and Jeremiah"], correctIndex: 1, explanation: "Moses and Elijah spoke with Jesus on the mountain.", verseRef: "Matthew 17:3" },
    { question: "What sign did Judas give to identify Jesus?", options: ["A shout", "A kiss", "A torch", "A written note"], correctIndex: 1, explanation: "Judas kissed Jesus in the garden.", verseRef: "Matthew 26:48-49" },
    { question: "Which Gospel records the 'I am' statements most fully?", options: ["Matthew", "Mark", "Luke", "John"], correctIndex: 3, explanation: "John presents seven 'I am' declarations.", verseRef: "John 8:58" },
    { question: "Where did Jesus weep before raising Lazarus?", options: ["Bethany", "Jerusalem", "Nazareth", "Sychar"], correctIndex: 0, explanation: "Jesus was deeply moved at Lazarus' tomb.", verseRef: "John 11:35" },
    { question: "How many baskets of leftovers after feeding four thousand?", options: ["Five", "Seven", "Twelve", "None"], correctIndex: 1, explanation: "Seven baskets remained after the four thousand were fed.", verseRef: "Matthew 15:37" },
    { question: "Who said 'You are the Christ, the Son of the living God'?", options: ["John", "Peter", "Andrew", "Thomas"], correctIndex: 1, explanation: "Peter's confession at Caesarea Philippi.", verseRef: "Matthew 16:16" },
  ],
};

export function getTriviaSeed(storageKey: string, category: string): TriviaQuestion[] {
  const challenging = storageKey.endsWith("_challenging");
  const base = category;
  if (challenging) {
    return (
      TRIVIA_SEED_CHALLENGING[base] ??
      TRIVIA_SEED[base]?.map((q) => ({ ...q })) ??
      []
    );
  }
  return TRIVIA_SEED[base] ?? [];
}
