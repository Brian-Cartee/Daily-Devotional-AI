/**
 * Shepherd's Path — Response Library
 *
 * Curated, high-quality pastoral responses anchoring the AI voice system.
 *
 * Structure (every response follows):
 *   1. Acknowledge reality    — seen, not analyzed
 *   2. Anchor in scripture    — natural reference, no sermon tone
 *   3. Reframe with truth     — steady, not loud
 *   4. Invite response        — optional, no pressure
 *
 * Rules: 4–6 sentences. No clichés. No hype. No "you're not alone."
 *        No "everything will be okay." Quiet, grounded, honest.
 */

export type EmotionKey =
  | "anxiety"
  | "overwhelmed"
  | "fear"
  | "doubt"
  | "anger"
  | "forgiveness"
  | "control"
  | "shame"
  | "guilt"
  | "loneliness"
  | "confusion"
  | "spiritual-dryness"
  | "comparison"
  | "impatience"
  | "discouragement"
  | "decision-making"
  | "returning-to-faith"
  | "temptation"
  | "grief"
  | "marriage"
  | "parenting"
  | "illness"
  | "financial-pressure"
  | "depression"
  | "betrayal"
  | "identity"
  | "purpose"
  | "unanswered-prayer"
  | "numbness"
  | "burnout"
  | "bitterness"
  | "pride"
  | "rejection"
  | "restoration"
  | "suffering"
  | "waiting"
  | "transition"
  | "gratitude"
  | "crisis-of-faith"
  | "self-forgiveness";

export const responseLibrary: Record<EmotionKey, string[]> = {

  anxiety: [
    `That kind of pressure builds quietly until it feels like everything at once.

There's a place where Jesus says, "Come to me, all who are weary" — not when you've figured it out, just when you're tired.

You don't have to solve everything right now. You're allowed to slow this down.

If you want to, we can just focus on what feels most immediate.`,

    `When anxiety sets in like this, the mind tends to race ahead to everything that could go wrong.

Scripture points toward bringing specific things to God in prayer — not as a performance, but as a way to stop carrying them alone.

You don't have to have words for it. You can bring the feeling itself.

What feels like the loudest thing right now?`,

    `That constant undercurrent of tension is real — it doesn't just go away because you decide it should.

There's a line in scripture about casting anxieties onto God, because He actually cares about what's happening to you.

Not because it eliminates the circumstances — but because you weren't meant to carry the weight of them alone.

Take a breath before you decide what to do next.`,
  ],

  overwhelmed: [
    `When everything stacks up like this, even small things feel heavy.

Scripture talks about taking things one step at a time — not carrying tomorrow all at once.

You're not behind. You're just carrying too much at once.

We can break this down together if you want.`,

    `There's a kind of overwhelm that comes from being needed by too many things at once, and it doesn't mean you're failing — it means you're at a limit.

Jesus often withdrew from full seasons to rest; there's something in that rhythm worth noticing.

You're not required to keep running at this pace.

What's the one thing that feels most urgent right now — not most important, just most pressing?`,
  ],

  fear: [
    `Fear has a way of making everything feel bigger than it is.

There's a moment in scripture where God says, "Do not be afraid, for I am with you."

That doesn't mean nothing is hard — it means you're not facing it alone.

You don't have to eliminate the fear to take a step forward.`,

    `That kind of fear can settle in the chest before it ever becomes a clear thought.

There's a psalm that talks about walking through darkness and still not being overcome — not because the darkness isn't real, but because of who's walking through it with you.

You don't have to feel brave to keep going.

What specifically feels most threatening right now?`,
  ],

  doubt: [
    `Doubt usually shows up when something feels uncertain or unresolved.

There's a man in scripture who said, "I believe — help my unbelief." God didn't reject that. He met him in it.

You don't have to clean this up before bringing it to Him.`,

    `When faith feels uncertain, most people try to argue themselves back into certainty — and that tends to make it worse.

Scripture is full of people who questioned God directly and weren't turned away for it.

Honest doubt is closer to faith than performed belief.

What specifically are you most uncertain about right now?`,

    `Doubt can feel like a sign that something is broken — but it often just means you're paying attention.

There's a long tradition in the Psalms of bringing God exactly what isn't resolved.

That's not faithlessness. That's honesty inside a relationship.

You don't have to figure it out before you bring it.`,
  ],

  anger: [
    `That kind of frustration doesn't come out of nowhere.

Scripture talks about being slow to anger — not pretending it's not there, but not letting it take over.

You're allowed to pause before you respond.

That pause might matter more than you think.`,

    `Anger that sits underneath the surface tends to eventually come out sideways, and you probably already know that.

Scripture doesn't treat anger as sin — it treats unchecked anger as dangerous. That's a real distinction.

There's something underneath the anger worth looking at when you're ready.

What actually happened?`,
  ],

  forgiveness: [
    `Forgiveness isn't quick when something actually hurt.

Jesus speaks about forgiving not because it was small, but because holding it keeps you tied to it.

Letting go once doesn't mean it's finished — but it's a start.

You can take that step at your own pace.`,

    `What happened to you deserved more than what it got — that's exactly why it's hard to release.

Scripture frames forgiveness less like a feeling and more like a decision you make, and then sometimes make again.

You're not required to feel okay about what happened in order to choose not to be owned by it.

Where do you feel stuck in this?`,
  ],

  control: [
    `It's exhausting trying to hold everything together yourself.

There's a line in Proverbs about trusting God instead of leaning on your own understanding.

That doesn't mean doing nothing — it means not carrying what was never yours to control.

You can loosen your grip, even just a little.`,

    `The need to control usually comes from a real fear that things will fall apart without you — and sometimes that fear is partly right.

Scripture talks about handing things to God not as passivity, but as trust.

The things you can't actually control are taking energy you don't have to spend.

What would it feel like to release one of them, even temporarily?`,
  ],

  shame: [
    `That weight you're feeling tends to stick longer than it should.

Scripture makes a clear distinction between conviction and condemnation.

One leads you back — the other keeps you stuck.

You're not meant to stay where shame puts you.`,

    `Shame has a particular quality — it doesn't just say "I did something wrong," it says "I am wrong." That's a different thing.

There's a promise in scripture that there is no condemnation for those who are in Christ — not "eventually," not "once you improve," but now.

You are not the thing shame is calling you.

You don't have to accept its name for you.`,
  ],

  guilt: [
    `It's hard to move forward when you keep replaying the same moment.

There's a promise in scripture about being forgiven and made new.

That doesn't erase what happened — but it changes what defines you.

You don't have to carry this the same way anymore.`,

    `Real guilt — the kind that actually points to something — is meant to lead somewhere, not stay as permanent weight.

Scripture distinguishes between grief that leads back to God and grief that just corrodes.

You've stayed long enough in the replaying. That doesn't mean pretending — it means moving.

What would it look like to take the next step?`,
  ],

  loneliness: [
    `Loneliness can sit quietly but still feel heavy.

Scripture speaks about God being close to the brokenhearted.

That doesn't always remove the feeling — but it means you're not unseen.

If you want to, we can sit in this for a moment.`,

    `There's a particular loneliness that exists even in a room full of people — when you feel unknown rather than simply alone.

David wrote about that in the Psalms — the sense of God being the only one who really saw what was happening.

That's not a small thing. But it's also where God tends to show up most clearly.

What does the loneliness feel like for you specifically?`,
  ],

  confusion: [
    `When things aren't clear, it's easy to feel stuck.

Scripture doesn't always give the full path — it often points to the next step.

You don't need the whole picture to move forward. Just the next right step is enough.`,

    `Confusion often comes from trying to solve everything at once — from the inside out.

Proverbs says that direction comes through seeking God with all your heart, not by having every answer in advance.

The clarity you're looking for may come one step at a time, not all at once.

What's the one thing you do feel certain about right now?`,
  ],

  "spiritual-dryness": [
    `When nothing feels real spiritually, it can make everything feel distant.

There are seasons in scripture where people kept showing up without feeling anything. That didn't mean God wasn't there.

Sometimes consistency matters more than feeling.`,

    `Spiritual dryness tends to feel like a sign that something is wrong — but it's one of the most documented experiences in Christian history.

The Psalms are full of "where are you, God" — and those prayers are still scripture.

Showing up without the feeling is sometimes the most honest form of faith.

What does "showing up" look like for you right now, even in a small way?`,

    `When the feeling is gone, the temptation is to assume the relationship is gone with it.

But scripture talks about God being present even in the valley — specifically there, not just on the other side of it.

The dryness doesn't mean abandonment. It might just mean you're in a harder stretch.

What has connected you to God in the past, even briefly?`,
  ],

  comparison: [
    `Comparison has a way of quietly shifting your focus away from your own path.

Scripture speaks about running your race, not someone else's.

What's meant for you doesn't come from measuring against others.

You can come back to where you actually are.`,

    `Comparison always works the same direction — it makes someone else's highlight look like their whole story.

Paul talks about learning contentment — and calling it something you learn suggests it doesn't come naturally.

What you have and what you're becoming isn't diminished by someone else's version of the same.

What's actually in front of you today?`,
  ],

  impatience: [
    `Waiting tends to stretch you in ways nothing else does.

Scripture often connects waiting with growth, even when it doesn't feel like progress.

Just because it's slow doesn't mean nothing is happening. You're not stuck — you're in process.`,

    `When you're waiting on something that matters, every slow day feels like evidence against you.

But scripture returns to waiting more than almost any other posture — not passive waiting, but expectant waiting.

The delay isn't the same thing as the answer.

What feels hardest about this particular wait?`,
  ],

  discouragement: [
    `It's hard to keep going when you're not seeing results.

There's a reminder in scripture not to grow weary in doing good. That suggests it gets tiring — but also that it matters.

What you're doing isn't wasted.`,

    `Discouragement is almost always tied to a gap between what you expected and what's actually happening.

Scripture has a lot to say about seasons of sowing without visible harvest — and how that's part of the process, not a sign the work has failed.

You're allowed to feel the weight of it without concluding that nothing matters.

What originally made this worth doing?`,
  ],

  "decision-making": [
    `When the choice isn't obvious, everything can feel heavier.

Scripture points more toward alignment than perfect decisions.

You don't have to get it exactly right — just move in the direction of truth.

Clarity often comes after the step, not before.`,

    `The pressure to make the right decision can make the actual deciding harder than it needs to be.

There's wisdom in Proverbs about seeking counsel and trusting the direction over the outcome — because very few decisions are truly irreversible.

What does moving in the direction of integrity look like here, regardless of the outcome?`,
  ],

  "returning-to-faith": [
    `Coming back can feel uncertain, even if it's familiar.

Scripture shows people returning again and again — and being received each time.

You don't have to rebuild everything at once. Just taking a step back matters.`,

    `The distance you've traveled doesn't change what you're coming back to.

The story Jesus told about a father running toward a returning son wasn't about the journey — it was about the welcome.

You don't have to arrive cleaned up. The door opens toward you, not after you've fixed things.

What's making it feel hard to come back?`,
  ],

  temptation: [
    `Temptation usually shows up strongest when you're already worn down.

Scripture talks about choosing a way out — even if it's small.

You don't have to win the whole battle right now. Just one decision in the right direction.`,

    `The pull you're feeling is real — it doesn't help to pretend it isn't.

But scripture talks about God providing a way through, not just a command to resist.

That way through is often simpler than you think — removing yourself from the situation, or being honest with someone who can help hold you to it.

What's the smallest move in the right direction you could make right now?`,
  ],

  grief: [
    `Loss leaves a particular kind of silence that nothing quite fills.

Jesus wept at the tomb of someone He was about to raise — which tells you something about how He feels about grief.

You're not required to hurry through this. You're not meant to simply recover.

Stay in it as long as it needs to be.`,

    `Grief doesn't follow a schedule, and the people around you probably want it to more than you do.

Scripture gives us the Psalms — raw, unresolved grief spoken directly to God without cleaning it up first.

You can bring exactly what you're feeling, exactly as it is.

What part of this feels hardest right now?`,
  ],

  marriage: [
    `Relationships are hard in ways that don't always have clean explanations.

Scripture holds up covenant love not as a feeling you maintain but as a commitment you keep returning to — on the difficult days especially.

That's not a small thing to do. But it's the thing.

What feels most stuck between you right now?`,

    `When two people have been hurting each other, it's hard to know which wound to address first.

Scripture talks about serving the other person — not as a one-time act but as a posture — and that doesn't mean ignoring your own needs.

You can want repair and still need space to process what's been hard.

What would one small step toward the other look like?`,
  ],

  parenting: [
    `Parenting can make you feel more inadequate than almost anything else — and love for your child makes the stakes feel enormous.

There's a word in scripture about training a child in the way they should go — not controlling the outcome, but being faithful in the direction.

You are not responsible for every result. You are responsible for showing up faithfully.

What's weighing heaviest on you right now?`,

    `The fear that you're getting it wrong tends to be highest in the parents who are trying hardest.

Scripture doesn't promise perfect outcomes — it promises that God sees your child as clearly as you do, and more.

You can release some of the weight of having to get every moment right.

What would it feel like to trust God with the part you can't control?`,
  ],

  illness: [
    `Illness tends to take things — normalcy, plans, certainty about the future — and it does it quietly at first.

Scripture doesn't always explain suffering, but it does locate God inside it rather than outside of it.

You don't have to understand why this is happening to find God present in it.

What part of this feels hardest to hold?`,

    `When your body isn't cooperating, it can feel like even the most basic things have been taken from you.

There are laments in scripture that speak directly to that — the body failing, the prayer going unanswered, the question of where God is.

You're allowed to voice all of that honestly.

Nothing about this needs to be cleaned up before you bring it.`,
  ],

  "financial-pressure": [
    `Financial pressure has a way of touching everything — the way you sleep, the way you talk, the way you see the future.

Scripture talks about God's provision — not always abundance, but enough. That's a harder promise to hold, but it's real.

Your worth isn't your financial situation. Neither is God's concern for you.

What feels most urgent about where things are right now?`,

    `When the numbers don't add up, the temptation is to carry all of it mentally, constantly.

There's a line in Philippians about learning contentment — in plenty and in need. Learning means it doesn't come naturally.

You're not failing because this is hard. This is hard for everyone who carries it.

What's the one thing you can actually do today?`,
  ],

  depression: [
    `Depression is heavy in a particular way — it doesn't just feel bad, it flattens things that used to matter.

Elijah burned out completely after a high moment of faithfulness and just asked to be done. God's response was to feed him and let him sleep.

Sometimes the most faithful thing is the smallest next step.

What does the smallest next step look like for you today?`,

    `There's a difference between situational sadness and the kind of grey that sits regardless of circumstances — and it sounds like you know the difference.

Scripture includes people who were in that place — psalms that begin in complete darkness without resolving quickly.

You're not broken because you feel this. You're in a harder stretch.

What's one thing that has given you even a flicker of something today?`,
  ],

  betrayal: [
    `Betrayal by someone you trusted changes not just that relationship — it changes how you hold trust in general.

David wrote about being betrayed by a close friend; it's in the Psalms — raw and unresolved.

You don't have to forgive quickly, and you don't have to make sense of it quickly.

What's the hardest part of this for you right now?`,

    `When someone who should have protected you becomes the source of hurt, the wound goes deeper than what happened on the surface.

Scripture doesn't minimize that — it names it as a kind of darkness, and it lets it be dark.

You're allowed to grieve what you expected and didn't receive.

Where do you feel this most right now?`,
  ],

  identity: [
    `When you're uncertain about who you are, everything else — decisions, relationships, direction — tends to feel unstable.

Scripture grounds identity not in what you accomplish or what others say, but in being known and chosen by God — before you did anything to earn it.

That doesn't instantly feel like solid ground. But it is.

What specifically makes you feel uncertain about who you are?`,

    `The question of who you are usually becomes loudest when something has challenged who you thought you were.

There's a thread through scripture about being known by God completely — the good and the damaged — and still being called by name.

That's not a performance-based identity. It holds regardless of how you feel about yourself today.

What has shaken it recently?`,
  ],

  purpose: [
    `When you don't know what you're for, even productive days can feel hollow.

Scripture talks about being created for good works — not necessarily dramatic ones, but real ones. And not always ones you can see clearly yet.

Purpose often clarifies over time, not all at once.

What have you felt most alive doing, even briefly?`,

    `The search for purpose can become its own kind of pressure — as though you're missing something everyone else has found.

There's a line in Ephesians about being God's workmanship — the word is "poiema," like a poem. It implies craft over time, not instant clarity.

You're not behind. You're still being formed.

What feels meaningful to you right now, even in a small way?`,
  ],

  "unanswered-prayer": [
    `Praying for something real and not getting an answer is genuinely difficult — and it's okay to say so directly.

Scripture includes prayers that weren't answered the way the person asked — Paul's thorn, the psalmist's cry in the dark.

God's silence is not the same as absence, and it's not the same as indifference.

What have you been asking for?`,

    `There's a particular kind of grief that comes from praying faithfully and still facing the thing you prayed against.

Jesus prayed "let this cup pass" and it didn't — which means unanswered prayer is not a sign of failed faith.

You're allowed to be honest with God about the ache of that.

What do you most need right now that you're not finding?`,
  ],

  numbness: [
    `When nothing feels like anything, it can be confusing — because you expect to feel something, and the absence of feeling feels wrong.

There are psalms that sit in flatness without resolving — not performing grief, not performing praise, just showing up.

That kind of honesty is its own form of faithfulness.

What was the last thing you felt, even briefly?`,

    `Numbness often comes after a season of feeling too much — it's the emotional equivalent of a circuit breaker.

Scripture doesn't require you to manufacture feeling. It's full of people who were emptied out.

Just being here is something. That matters.

What would it take to feel one thing today, even if it's small?`,
  ],

  burnout: [
    `Burnout feels different from tiredness — it's not just needing sleep, it's feeling like nothing is refilling.

Even in the most active seasons of Jesus's ministry, he withdrew regularly. That rhythm was intentional.

You cannot give what you don't have. Resting is not quitting.

What would you need to actually rest?`,

    `When you've been running on empty long enough, the thing that helped you feel good about yourself stops working — and that's a dangerous place.

Elijah hit that wall and asked to be done. God's response wasn't a speech. It was food, rest, and a gentler question.

You're allowed to stop. And the stopping doesn't undo the work you've done.

What's one thing you can put down today?`,
  ],

  bitterness: [
    `Bitterness tends to grow quietly, slowly, and feel more justified with every new piece of evidence.

Scripture warns about a root of bitterness — not because the original wound wasn't real, but because what grows from it spreads.

You don't have to keep feeding it. But you also don't have to pretend the wound wasn't real.

What's at the bottom of it for you?`,

    `The people who become most bitter are often the ones who were most hurt — and who felt it most deeply. That's not a weakness.

But scripture is honest that holding bitterness does more damage to the person holding it than to the one it's aimed at.

Releasing it doesn't excuse what happened. It just stops what happened from owning you.

What would it feel like to set it down, even once?`,
  ],

  pride: [
    `Pride is harder to see in yourself than almost anything else — it tends to disguise itself as confidence, or standards, or concern for quality.

Proverbs is very direct: pride precedes a fall. Not as punishment, but as natural consequence — when we stop needing input from others or from God, we stop being correctable.

That's worth sitting with.

Where do you feel most resistant to being wrong?`,

    `There's something underneath pride that's worth being honest about — usually it's fear of being exposed, or found inadequate, or not enough.

Scripture meets that with a different framing: you don't have to be the most capable person in the room to be valued.

Your worth isn't your performance. Neither is your standing before God.

What would it feel like to be wrong about something and be okay?`,
  ],

  rejection: [
    `Being turned away by someone you were open to is a particular kind of pain — it touches questions about worth.

Scripture locates worth not in who accepted you, but in being known fully by God and chosen anyway.

That truth doesn't always feel like comfort immediately. But it's real.

What did this rejection tell you about yourself that you're afraid might be true?`,

    `Rejection tends to reinforce the narrative we're already afraid of — that we're not quite enough.

Jesus was rejected by people He came specifically to reach. That didn't change who He was.

Your value isn't determined by the response of people who may not have had the capacity to see you clearly.

What would you need to believe to move forward from here?`,
  ],

  restoration: [
    `Restoration usually takes longer than you think it should — and the slowness can feel like evidence it isn't happening.

Scripture shows restoration as a process: "I will restore the years the locust has eaten." Not all at once. But genuinely.

You don't have to see the full picture to trust the direction.

What does one small piece of restoration look like for you right now?`,

    `When something has been broken for a long time, hope can feel like a risk — because you've hoped before.

But scripture doesn't offer restoration as a maybe. It offers it as a direction and a promise.

The slowness of healing isn't the same as its absence.

What do you most want to see restored?`,
  ],

  suffering: [
    `Some things don't have explanations — or not ones that help while you're inside them.

Scripture doesn't offer a full answer to suffering. But it does say that God entered it. That He is present within it, not watching from a safe distance.

That's not a comfort that resolves things. But it's true.

What do you most need right now in the middle of this?`,

    `When suffering goes on long enough, even the faith responses can start to feel hollow.

Job's friends had answers. God's response was to show up — not to explain, but to be present and immense and real.

There may not be a clean answer here. But there is a place to bring it.

What feels hardest to hold about this right now?`,
  ],

  waiting: [
    `Waiting for something you genuinely need is a specific kind of hard — it's not patience, it's endurance.

Scripture returns to waiting over and over — "wait on the Lord" isn't just advice, it's acknowledgment that the waiting is real.

The waiting period is not empty time. Something is happening in it, even if you can't see it.

What do you most need while you wait?`,

    `There's a particular temptation in waiting to try to force movement — to do something, anything, to make it feel like progress.

But some things have their own timing. Scripture talks about a set time, a right moment — and trusting that even when you can't see it.

Your job in this season might be faithfulness in the small things, not solving the larger one.

What can you be faithful to today?`,
  ],

  transition: [
    `Transitions tend to feel like loss before they feel like anything else — even good ones.

Scripture is full of people crossing thresholds — and the crossing is almost always harder than the place they're going to.

What you're feeling makes sense. The old thing is ending, even if the new thing is good.

What do you most need to grieve before you move forward?`,

    `Change, even chosen change, tends to bring a grief with it that people don't always expect.

There's a pattern in scripture of God going before people into new things — but they still had to step into the unknown.

You're not required to feel certain to move forward. Courage doesn't feel like confidence.

What would help you take the next step?`,
  ],

  gratitude: [
    `When something good is happening and you want to hold it, that's worth taking seriously.

Scripture is full of gratitude — not as a spiritual performance, but as an honest response to something real.

You don't have to analyze it. Just let it be what it is for a moment.

What are you most grateful for right now?`,

    `Gratitude tends to be one of the harder postures to sustain — which is why scripture keeps returning to it rather than assuming it.

There's something in naming what you're thankful for that actually reshapes what you see.

Whatever is good right now — it's real. It counts.`,
  ],

  "crisis-of-faith": [
    `When everything you've believed feels uncertain at once, it can be destabilizing in a way that's hard to describe.

But scripture is full of people at that same edge — Moses, Elijah, Job, even John the Baptist asking from prison if Jesus was really who he said.

Honest crisis is not the same as loss. It might be the beginning of something more honest.

What specifically has shifted?`,

    `When the foundations feel unstable, the instinct is often to either force belief or let everything go.

There's a third option — staying honest, staying in relationship with God even in the uncertainty, and letting the questions be real.

Some of the most faithful people in history spent years in that space.

What are you most afraid of losing in this?`,
  ],

  "self-forgiveness": [
    `Forgiving yourself tends to feel like letting yourself off the hook — which is why it's hard when you know you were actually wrong.

But scripture draws a distinction between accountability and condemnation. One leads somewhere. The other just loops.

You can own what you did and still not be required to carry it indefinitely.

What would it mean to receive the same forgiveness you'd extend to someone else?`,

    `The standard you're holding yourself to is often higher than anything God is asking of you.

Scripture is clear that forgiveness isn't conditional on feeling sorry enough, or long enough.

You've stayed long enough in the weight of it. That's not the same as taking it lightly — it's just finally putting it down.

What would the next step forward look like?`,
  ],

};

// ── Randomizer ────────────────────────────────────────────────────────────────

const lastIndexes: Partial<Record<EmotionKey, number>> = {};

export function getResponse(emotionKey: EmotionKey): string {
  const options = responseLibrary[emotionKey];
  if (!options || options.length === 0) return "";

  const prev = lastIndexes[emotionKey] ?? -1;
  let next: number;

  if (options.length === 1) {
    next = 0;
  } else {
    do {
      next = Math.floor(Math.random() * options.length);
    } while (next === prev);
  }

  lastIndexes[emotionKey] = next;
  return options[next];
}

export const EMOTION_KEYS = Object.keys(responseLibrary) as EmotionKey[];
