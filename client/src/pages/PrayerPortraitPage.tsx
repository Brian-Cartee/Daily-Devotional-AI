import { useLocation } from "wouter";
import { PrayerPortrait } from "@/components/PrayerPortrait";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { motion } from "framer-motion";
import { Heart, Lock, ArrowLeft } from "lucide-react";

export default function PrayerPortraitPage() {
  const [, navigate] = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isPro = isProVerifiedLocally();

  if (!isPro) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-background pb-32 pt-20">
            <button
            onClick={() => { sessionStorage.setItem('scrollToExplore', '1'); navigate('/'); }}
            data-testid="button-back-prayer-portrait"
            className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-[13px] font-semibold hover:bg-muted/80 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm mx-auto px-6 text-center flex flex-col items-center gap-6 pt-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Pro Feature</p>
              <h1 className="text-[22px] font-bold text-foreground mb-3 leading-tight">
                Personal Prayer Portrait
              </h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Share a photo of yourself and a few things on your heart. We'll craft a prayer written just for you — in this moment.
              </p>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              data-testid="btn-portrait-upgrade"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[15px] py-4 shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]"
            >
              <Lock className="w-4 h-4" />
              Unlock with Pro
            </button>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-[260px]">
              Your photo is sent privately to generate your prayer and is never stored on our servers.
            </p>
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
