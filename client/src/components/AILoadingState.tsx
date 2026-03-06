import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AILoadingStateProps {
  type: "reflection" | "prayer";
}

export function AILoadingState({ type }: AILoadingStateProps) {
  const loadingText = type === "reflection" 
    ? "Gathering thoughts for your reflection..." 
    : "Writing a personalized prayer...";

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="p-8 mt-8 text-center rounded-2xl glass-card relative overflow-hidden"
    >
      <div className="absolute inset-0 animate-shimmer opacity-30 pointer-events-none" />
      
      <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-8 h-8 text-primary/70" />
        </motion.div>
        
        <p className="text-muted-foreground font-medium animate-pulse">
          {loadingText}
        </p>
        
        <div className="w-full max-w-sm space-y-3 mt-4">
          <div className="h-3 bg-muted rounded-full w-full overflow-hidden relative">
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          </div>
          <div className="h-3 bg-muted rounded-full w-4/5 mx-auto overflow-hidden relative">
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          </div>
          <div className="h-3 bg-muted rounded-full w-5/6 mx-auto overflow-hidden relative">
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
