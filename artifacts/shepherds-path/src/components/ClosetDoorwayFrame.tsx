import type { ReactNode } from "react";

const CLOSET_DOORWAY_SRC = "/closet-doorway.png";

/** Open bifold doors above the room — transition from app into the closet */
export function ClosetDoorwayFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto max-w-xl w-full" data-testid="closet-doorway-frame">
      <div className="relative rounded-t-2xl overflow-hidden border-x border-t border-violet-500/20">
        <img
          src={CLOSET_DOORWAY_SRC}
          alt=""
          className="w-full h-[min(38vw,168px)] object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0f0a18]" />
        <div
          className="absolute inset-x-0 top-0 h-12 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 100% at 50% 0%, rgba(251,191,36,0.18) 0%, transparent 65%)",
          }}
        />
      </div>
      <div className="-mt-1">{children}</div>
    </div>
  );
}
