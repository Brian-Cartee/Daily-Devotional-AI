import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { getRelationshipAge } from "@/lib/relationship";

function shouldHideDuplicateTalkCta(): boolean {
  try {
    if (localStorage.getItem("sp_guidance_visited")) return true;
    return getRelationshipAge() >= 3;
  } catch {
    return false;
  }
}

/** Quiet doorway to Guidance — hidden once Talk It Through is familiar */
export function HomeHeartLink() {
  if (shouldHideDuplicateTalkCta()) return null;

  return (
    <Link href="/guidance">
      <div
        data-testid="card-home-heart-link"
        className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3.5 hover:bg-card/80 active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="w-4 h-4 text-primary/60 shrink-0" />
          <p className="text-[14px] text-foreground/85 leading-snug">
            Something heavy on your heart?{" "}
            <span className="font-semibold text-foreground">Talk it through</span>
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      </div>
    </Link>
  );
}
