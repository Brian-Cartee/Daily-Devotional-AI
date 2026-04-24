import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";

interface AIResponseCardProps {
  content: string;
  type: "reflection" | "prayer";
}

export function AIResponseCard({ content, type }: AIResponseCardProps) {
  const Icon = type === "reflection" ? Sparkles : Heart;
  const title = type === "reflection" ? "Guided Reflection" : "Your Prayer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-6 bg-card border border-border rounded-2xl p-6 sm:p-7 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 rounded-l-2xl" />

      <div className="flex items-center gap-2.5 mb-5 pl-2">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-sm text-foreground tracking-tight">{title}</h3>
      </div>

      <div className="pl-2 space-y-3">
        {content.split('\n').map((paragraph, idx) =>
          paragraph.trim() ? (
            <p key={idx} className="text-[14px] leading-relaxed text-foreground/75">
              {paragraph}
            </p>
          ) : null
        )}
      </div>

      <div className="absolute bottom-0 right-0 p-6 opacity-[0.04] pointer-events-none">
        <Icon className="w-20 h-20" />
      </div>
    </motion.div>
  );
}
