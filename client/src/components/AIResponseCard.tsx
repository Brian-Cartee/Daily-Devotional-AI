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
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mt-8 glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary/40 to-secondary/40" />
      
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>
      
      <div className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300 max-w-none">
        {content.split('\n').map((paragraph, idx) => (
          paragraph.trim() ? (
            <p key={idx} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ) : null
        ))}
      </div>
      
      <div className="absolute bottom-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500">
        <Icon className="w-24 h-24" />
      </div>
    </motion.div>
  );
}
