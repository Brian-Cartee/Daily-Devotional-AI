import { BRAND_ICON } from "@/lib/brand";

type BrandIconProps = {
  size?: number;
  className?: string;
};

/** Renders the full speech-bubble logo without cropping (object-contain). */
export function BrandIcon({ size = 48, className = "" }: BrandIconProps) {
  return (
    <img
      src={BRAND_ICON}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className}`.trim()}
      decoding="async"
    />
  );
}
