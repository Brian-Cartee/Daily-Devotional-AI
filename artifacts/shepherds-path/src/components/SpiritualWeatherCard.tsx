import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";

const SHOWN_KEY = "sp_weather_week";

function weekId(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-w${week}`;
}

type WeatherData = {
  shouldShow: boolean;
  weekLabel: string;
  observations: string[];
  invitation: string;
  guidancePrefill?: string;
  tier?: "free" | "pro";
  seasonLetter?: string | null;
  theme?: string | null;
};

export function SpiritualWeatherCard() {
  const [open, setOpen] = useState(false);
  const sessionId = getSessionId();
  const isPro = isProVerifiedLocally();

  const { data } = useQuery<{ weather: WeatherData }>({
    queryKey: ["/api/home/weekly-weather", sessionId, isPro],
    queryFn: async () => {
      const res = await fetch(
        `/api/home/weekly-weather?sessionId=${encodeURIComponent(sessionId)}&isPro=${isPro}`,
      );
      if (!res.ok) throw new Error("weather failed");
      return res.json();
    },
    staleTime: 300_000,
  });

  const weather = data?.weather;

  useEffect(() => {
    if (!weather?.shouldShow || weather.observations.length === 0) return;
    if (localStorage.getItem(SHOWN_KEY) === weekId()) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [weather?.shouldShow, weather?.observations?.length]);

  const dismiss = () => {
    try {
      localStorage.setItem(SHOWN_KEY, weekId());
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  const talkHref = weather?.guidancePrefill
    ? `/guidance?situation=${encodeURIComponent(weather.guidancePrefill)}`
    : "/guidance";

  const isProWeather = weather?.tier === "pro" || isPro;

  return (
    <AnimatePresence>
      {open && weather && (
        <motion.div
          key="weather"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(158deg, #3d1a6e 0%, #1a0835 55%, #0d0612 100%)",
              border: "1px solid rgba(160,80,200,0.25)",
            }}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="px-6 pt-8 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/60">
                  {isProWeather ? "Spiritual weather" : "Your week, in your words"}
                </p>
                {isProWeather && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[9px] font-bold uppercase tracking-wider text-amber-200/90">
                    <Sparkles className="w-2.5 h-2.5" />
                    Pro
                  </span>
                )}
              </div>
              <p className="text-[13px] text-white/45 mb-4">{weather.weekLabel}</p>
              {isProWeather && weather.seasonLetter && (
                <p
                  className="text-[15px] text-white/88 leading-relaxed mb-4 italic"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {weather.seasonLetter}
                </p>
              )}
              <ul className="space-y-2.5 mb-5">
                {weather.observations.map((line, i) => (
                  <li key={i} className="text-[14px] text-white/80 leading-relaxed pl-3 border-l-2 border-violet-400/40">
                    {line}
                  </li>
                ))}
              </ul>
              <p className="text-[14px] text-white/55 mb-5">{weather.invitation}</p>
              {isProWeather && (
                <p className="text-[11px] text-white/35 mb-4 leading-relaxed">
                  Your weekly mirror also arrives by email on Sundays when your Pro email is linked to this device.
                </p>
              )}
              <Link href={talkHref} onClick={dismiss}>
                <span className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-semibold text-[14px]">
                  Talk with me about this
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="w-full mt-3 text-[13px] text-white/40 hover:text-white/60 py-2"
              >
                Not this week
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
