import { motion, AnimatePresence } from "framer-motion";

export type PhilipVoiceState =
  | "greeting"
  | "listening"
  | "processing"
  | "speaking"
  | "idle"
  | "hidden";

export interface PhilipVoiceScreenProps {
  state: PhilipVoiceState;
  speakingText?: string | null;
  onTap?: () => void;
}

const HALO: Record<Exclude<PhilipVoiceState, "hidden">, { color: string; pulse: number }> = {
  greeting:   { color: "rgba(251,191,36,0.55)",  pulse: 2.2 },
  listening:  { color: "rgba(74,222,128,0.50)",  pulse: 1.6 },
  processing: { color: "rgba(167,139,250,0.45)", pulse: 1.0 },
  speaking:   { color: "rgba(251,191,36,0.60)",  pulse: 2.4 },
  idle:       { color: "rgba(251,191,36,0.35)",  pulse: 3.5 },
};

// Portrait is 192px, centered in a 280px container → offset = (280-192)/2 = 44
const SIZE = 280;
const PORTRAIT = 192;
const PORTRAIT_OFFSET = (SIZE - PORTRAIT) / 2; // 44

export function PhilipVoiceScreen({ state, onTap }: PhilipVoiceScreenProps) {
  if (state === "hidden") return null;

  const { color, pulse } = HALO[state];

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: "#0e0905" }}
      onClick={onTap}
    >
      {/* Portrait + halo container — explicit size, no inset shorthand */}
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>

        {/* Outer breathing glow */}
        <motion.div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
          }}
          animate={{ scale: [1, 1.16, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: pulse, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner ring — 208px centered → offset 36 */}
        <motion.div
          style={{
            position: "absolute",
            top: 36, left: 36, right: 36, bottom: 36,
            borderRadius: "50%",
            border: `2px solid ${color.replace(/[\d.]+\)$/, "0.7)")}`,
          }}
          animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: pulse * 0.85, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Listening ripple — separate layer, expands outward */}
        <AnimatePresence>
          {state === "listening" && (
            <motion.div
              key="ripple"
              style={{
                position: "absolute",
                top: 30, left: 30, right: 30, bottom: 30,
                borderRadius: "50%",
                border: "1.5px solid rgba(74,222,128,0.7)",
              }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Philip portrait — explicit top/left/width/height, no inset */}
        <img
          src="/philip.jpg"
          alt="Philip"
          style={{
            position: "absolute",
            top: PORTRAIT_OFFSET,
            left: PORTRAIT_OFFSET,
            width: PORTRAIT,
            height: PORTRAIT,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        {/* Processing dots */}
        <AnimatePresence>
          {state === "processing" && (
            <motion.div
              key="dots"
              style={{
                position: "absolute",
                bottom: -8,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: 8,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "rgba(167,139,250,0.9)" }}
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
