import { useLocation } from "wouter";
import { PrayerPortrait } from "@/components/PrayerPortrait";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { motion } from "framer-motion";
import { Heart, Lock, ArrowLeft, Camera, Sparkles } from "lucide-react";

// Warm, contemplative photo — sunlight through forest canopy
const HERO_PHOTO = "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=900&q=85&auto=format&fit=crop";

export default function PrayerPortraitPage() {
  const [, navigate] = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isPro = isProVerifiedLocally();

  if (!isPro) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-background pb-32 pt-16">

          {/* ── Hero photo strip ────────────────────────────────── */}
          <div className="relative w-full overflow-hidden" style={{ height: 260 }}>
            <img
              src={HERO_PHOTO}
              alt="Prayer portrait"
              className="w-full h-full object-cover object-center"
              style={{ filter: "brightness(0.72)" }}
            />
            {/* Gradient veil — top for back button, bottom into page */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 35%, transparent 50%, rgba(13,10,26,1) 100%)" }} />

            {/* Back button */}
            <button
              onClick={() => { sessionStorage.setItem('scrollToExplore', '1'); navigate('/'); }}
              data-testid="button-back-prayer-portrait"
              className="absolute top-3 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white text-[13px] font-semibold hover:bg-black/55 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {/* Icon badge — sits at bottom of hero, overlapping page bg */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/35 border-4 border-background">
                <Heart className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="max-w-sm mx-auto px-6 text-center flex flex-col items-center gap-5 pt-12"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-2">Pro Feature</p>
              <h1 className="text-[24px] font-bold text-foreground mb-3 leading-tight">
                Personal Prayer Portrait
              </h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Share a photo of yourself and a few things on your heart. We'll craft a prayer written just for you — in this moment.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="w-full space-y-2.5 text-left">
              {[
                { Icon: Camera, text: "Upload a photo of yourself" },
                { Icon: Sparkles, text: "AI crafts a prayer written over you" },
                { Icon: Heart, text: "Deeply personal — never stored on our servers" },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}>
                  <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-[13px] text-foreground/80">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowUpgrade(true)}
              data-testid="btn-portrait-upgrade"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[15px] py-4 shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]"
            >
              <Lock className="w-4 h-4" />
              Unlock with Pro
            </button>
          </motion.div>
        </main>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return (
    <PrayerPortrait
      situation=""
      onClose={() => navigate("/")}
    />
  );
}
