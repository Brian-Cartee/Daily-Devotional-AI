import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scroll, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";

interface ScriptureContextProps {
  reference: string;
  text: string;
}

interface ContextData {
  whoAndWhen: string;
  whatWasHappening: string;
  whyItMatters: string;
  bridge: string;
}

function Calm() {
  return (
    <div className="space-y-8 pt-2">
      {["Who wrote this · When", "What was happening", "Why it matters"].map((label) => (
        <div key={label} className="space-y-3">
          <div className="h-[10px] w-36 rounded-full bg-foreground/8 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded-full bg-foreground/6 animate-pulse" />
            <div className="h-3.5 w-[90%] rounded-full bg-foreground/6 animate-pulse" />
            <div className="h-3.5 w-[78%] rounded-full bg-foreground/6 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScriptureContext({ reference, text }: ScriptureContextProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<ContextData>({
    queryKey: ["/api/context", reference],
    queryFn: async () => {
      const params = new URLSearchParams({ reference, text });
      const res = await fetch(`/api/context?${params.toString()}`);
      if (!res.ok) throw new Error("context fetch failed");
      return res.json();
    },
    enabled: open,
    staleTime: Infinity,
    retry: 1,
  });

  return (
    <>
      <button
        data-testid="button-scripture-context"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/40 hover:text-amber-500 transition-colors duration-200 group"
      >
        <Scroll className="w-3.5 h-3.5 group-hover:text-amber-500 transition-colors" />
        Context
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-0 pb-0 max-h-[86vh] flex flex-col bg-background"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-9 h-[3.5px] rounded-full bg-foreground/12" />
          </div>

          {/* Sheet header */}
          <div className="px-6 pb-4 shrink-0 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/70 mb-1">
                Looking a little deeper at today's verse
              </p>
              <h2 className="text-[20px] font-bold text-foreground leading-tight">
                {reference}
              </h2>
            </div>
            <SheetClose asChild>
              <button
                data-testid="button-close-context"
                className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </SheetClose>
          </div>

          <div className="h-px bg-border/30 shrink-0 mx-6" />

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

            {/* Graceful error */}
            {isError && (
              <div className="py-10 text-center space-y-2">
                <p className="text-[15px] text-foreground/60 leading-relaxed">
                  We're having trouble loading the background right now —<br />
                  try again in a moment.
                </p>
              </div>
            )}

            {/* Calm loading — no heavy spinner */}
            {isLoading && <Calm />}

            {/* Content */}
            {data && (
              <>
                {/* Section 1 */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/60">
                    Who wrote this · When
                  </p>
                  <p className="text-[15px] leading-[1.8] text-foreground/80">
                    {data.whoAndWhen}
                  </p>
                </div>

                <div className="h-px bg-border/25" />

                {/* Section 2 */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/60">
                    What was happening
                  </p>
                  <p className="text-[15px] leading-[1.8] text-foreground/80">
                    {data.whatWasHappening}
                  </p>
                </div>

                <div className="h-px bg-border/25" />

                {/* Section 3 */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/60">
                    Why it matters
                  </p>
                  <p className="text-[15px] leading-[1.8] text-foreground/80">
                    {data.whyItMatters}
                  </p>
                </div>

                {/* Bridge — connects back to the devotional moment */}
                {data.bridge && (
                  <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-700/30 px-4 py-4">
                    <p className="text-[14px] leading-[1.75] text-amber-800/80 dark:text-amber-300/70 italic">
                      {data.bridge}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="h-4" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
