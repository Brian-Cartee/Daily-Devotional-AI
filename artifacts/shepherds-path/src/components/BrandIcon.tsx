import { BRAND_ICON } from "@/lib/brand";

type BrandIconProps = {
  size?: number;
  className?: string;
  /** On dark photos/gradients — hides the baked-in black PNG square via blend mode */
  onDark?: boolean;
};

/** Speech-bubble logo. Source PNG has no alpha; use `onDark` over photos. */
export function BrandIcon({ size = 48, className = "", onDark = false }: BrandIconProps) {
  return (
    <img
      src={BRAND_ICON}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${onDark ? "mix-blend-screen" : ""} ${className}`.trim()}
      decoding="async"
    />
  );
}
