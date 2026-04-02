import { useLocation } from "wouter";
import { Share2, ArrowDown, ChevronLeft, Heart, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const sunsetImg = "/daily-art/natural-sunset.jpg";

const CALLING_CARDS = [
  {
    id: 1,
    message: "Sharing is caring… but more than that — it's our calling.",
    scripture: "Matthew 28:19",
    meaning: "We are called to go, to share truth and hope with the world.",
    shareText: "Sharing is caring… but more than that — it's our calling.\n\n\"Go and make disciples of all nations.\"\n— Matthew 28:19\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 2,
    message: "Care enough to share. Called enough to act.",
    scripture: "James 2:17",
    meaning: "Faith without action is empty. Our care for others shows in what we do.",
    shareText: "Care enough to share. Called enough to act.\n\n\"Faith by itself, if it is not accompanied by action, is dead.\"\n— James 2:17\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 3,
    message: "Sharing hope isn't optional — it's part of the calling.",
    scripture: "1 Peter 3:15",
    meaning: "Hope is meant to be shared. Always be ready to give a reason for the hope you carry.",
    shareText: "Sharing hope isn't optional — it's part of the calling.\n\n\"Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have.\"\n— 1 Peter 3:15\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 4,
    message: "We don't just share… we serve, we care, we answer the call.",
    scripture: "Galatians 5:13",
    meaning: "Sharing is an act of service. Use your freedom to serve one another in love.",
    shareText: "We don't just share… we serve, we care, we answer the call.\n\n\"Serve one another humbly in love.\"\n— Galatians 5:13\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 5,
    message: "Share the Word. Answer the Call.",
    scripture: "Romans 10:14",
    meaning: "People need to hear. How can they believe if no one tells them?",
    shareText: "Share the Word. Answer the Call.\n\n\"How can they believe in the one of whom they have not heard?\"\n— Romans 10:14\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 6,
    message: "What you share could change a life.",
    scripture: "Proverbs 11:25",
    meaning: "A generous person prospers. Whoever refreshes others will themselves be refreshed.",
    shareText: "What you share could change a life.\n\n\"A generous person will prosper; whoever refreshes others will be refreshed.\"\n— Proverbs 11:25\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 7,
    message: "Carry one another. Share what matters.",
    scripture: "Galatians 6:2",
    meaning: "We were never meant to walk this alone. Carry each other's burdens.",
    shareText: "Carry one another. Share what matters.\n\n\"Carry each other's burdens, and in this way you will fulfill the law of Christ.\"\n— Galatians 6:2\n\nShepherd's Path · shepherdspath.app",
  },
];

function shareMessage(text: string) {
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).catch(() => {});
  }
}

export default function CallingPage() {
  const [, setLocation] = useLocation();

  const handleSendPrayer = () => {
    const text = "I prayed for you today. 🙏\n\nShepherd's Path · shepherdspath.app";
    shareMessage(text);
  };

  const handleShareScripture = () => {
    const text = "\"Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.\"\n— Matthew 28:19\n\nShepherd's Path · shepherdspath.app";
    shareMessage(text);
  };

  const handleShareApp = () => {
    const text = "This app has been meaningful to me and I thought of you.\n\nShepherd's Path — daily scripture, prayer, and guidance.\n\nshepherdspath.app";
    shareMessage(text);
  };

  return (
    <div className="min-h-screen bg-[#0d0a1a]" style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>

      {/* Back button */}
      <button
        onClick={() => setLocation("/")}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        data-testid="button-calling-back"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      {/* HERO — full viewport with sunset image */}
      <div className="relative w-full" style={{ height: "100svh", minHeight: 600 }}>
        <img
          src={sunsetImg}
          alt="Sunset over forest lake"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.82)" }}
        />
        {/* Gradient overlays */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 35%, rgba(13,10,26,0.6) 70%, rgba(13,10,26,1) 100%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3) 100%)" }}
        />

        {/* Hero text */}
        <div className="absolute bottom-0 left-0 right-0 px-7 pb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-xs tracking-[0.22em] uppercase mb-4"
          >
            Shepherd's Path
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white font-light leading-tight mb-4"
            style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.75rem, 6vw, 2.5rem)" }}
          >
            This Is More<br />Than an App
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-white/65 text-base leading-relaxed mb-8"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            You carry something someone needs.<br />Sharing it is the calling.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex justify-center"
          >
            <div className="flex flex-col items-center gap-1.5 text-white/35">
              <span className="text-xs tracking-widest uppercase">Scroll</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* INTRO SECTION */}
      <div className="px-7 py-12 text-center" style={{ background: "#0d0a1a" }}>
        <p className="text-white/35 text-xs tracking-[0.2em] uppercase mb-5">The Calling</p>
        <p
          className="text-white leading-relaxed mb-5"
          style={{ fontFamily: "'Georgia', serif", fontSize: "1.15rem" }}
        >
          "Go and make disciples of all nations."
        </p>
        <p className="text-white/45 text-sm mb-2" style={{ fontFamily: "'Georgia', serif" }}>
          — Matthew 28:19
        </p>
        <div className="w-10 h-px mx-auto mt-8" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      {/* CARDS */}
      <div className="px-5 pb-6 space-y-4">
        {CALLING_CARDS.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid={`card-calling-${card.id}`}
          >
            {/* Card top — colored accent bar */}
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #7A018D, #442f74)" }} />

            <div className="p-5">
              <p
                className="text-white leading-snug mb-3"
                style={{ fontFamily: "'Georgia', serif", fontSize: "1.05rem" }}
              >
                {card.message}
              </p>
              <p className="text-white/40 text-xs tracking-wide mb-3">— {card.scripture}</p>
              <p className="text-white/55 text-sm leading-relaxed mb-4">{card.meaning}</p>

              <button
                onClick={() => shareMessage(card.shareText)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #7A018D22, #442f7422)", border: "1px solid rgba(122,1,141,0.3)", color: "rgba(200,160,220,0.9)" }}
                data-testid={`button-calling-share-${card.id}`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Send this to someone
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MID DIVIDER */}
      <div className="px-7 py-10 text-center">
        <div className="w-10 h-px mx-auto mb-8" style={{ background: "rgba(255,255,255,0.12)" }} />
        <p
          className="text-white/60 leading-relaxed"
          style={{ fontFamily: "'Georgia', serif", fontSize: "1.1rem" }}
        >
          Someone needs what you're about to share.
        </p>
        <p className="text-white/30 text-sm mt-3">You never know who's waiting for it.</p>
        <div className="w-10 h-px mx-auto mt-8" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      {/* BOTTOM CTA */}
      <div className="px-5 pb-12 space-y-3">
        <p className="text-center text-white/35 text-xs tracking-[0.2em] uppercase mb-5">One Action. One Person.</p>

        <button
          onClick={handleShareApp}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-medium text-base"
          style={{ background: "linear-gradient(135deg, #7A018D, #442f74)", boxShadow: "0 8px 32px rgba(122,1,141,0.3)" }}
          data-testid="button-calling-share-app"
        >
          <Share2 className="w-5 h-5" />
          Share Shepherd's Path
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSendPrayer}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
            data-testid="button-calling-send-prayer"
          >
            <Heart className="w-4 h-4" />
            Send a Prayer
          </button>
          <button
            onClick={handleShareScripture}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
            data-testid="button-calling-share-scripture"
          >
            <BookOpen className="w-4 h-4" />
            Share Scripture
          </button>
        </div>
      </div>

    </div>
  );
}
