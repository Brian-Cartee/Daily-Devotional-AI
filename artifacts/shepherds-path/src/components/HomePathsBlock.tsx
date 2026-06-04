import { HomeExploreSection } from "@/components/HomeExploreSection";
import { HomePathShortcuts } from "@/components/HomePathShortcuts";
import { HomeSecondaryPathsRow } from "@/components/HomeSecondaryPathsRow";

export const HOME_PATHS_LAYOUT_ID = "focus-v3";

type HomePathsBlockProps = {
  homeDevotionalFocus: boolean;
  chapelWeekFocus: boolean;
  homeMarketplaceCollapsed: boolean;
  inNativeApp: boolean;
  chapelExploreCollapsed: boolean;
};

/**
 * Single home paths zone — featured doors + one expandable 16-path catalog.
 * Avoids duplicate browse buttons, peek rows, and conflicting expand controls.
 */
export function HomePathsBlock({
  homeDevotionalFocus,
  chapelWeekFocus,
  homeMarketplaceCollapsed,
  inNativeApp,
  chapelExploreCollapsed,
}: HomePathsBlockProps) {
  const showCatalog =
    homeDevotionalFocus
      ? inNativeApp || !chapelExploreCollapsed
      : homeMarketplaceCollapsed ||
        !chapelWeekFocus ||
        inNativeApp ||
        !chapelExploreCollapsed;

  if (homeDevotionalFocus) {
    if (!showCatalog) return <HomeSecondaryPathsRow />;
    return (
      <div
        className="flex flex-col gap-2.5"
        data-testid="home-paths-block"
        data-paths-layout={HOME_PATHS_LAYOUT_ID}
      >
        <HomeSecondaryPathsRow />
        <HomeExploreSection excludePreviewHrefs={["/prayer-closet"]} />
      </div>
    );
  }

  const showShortcuts = !homeMarketplaceCollapsed && chapelWeekFocus;
  if (!showShortcuts && !showCatalog) return null;

  const excludePreviewHrefs = showShortcuts ? ["/journal"] : [];

  return (
    <div
      className="flex flex-col gap-2.5"
      data-testid="home-paths-block"
      data-paths-layout="standard-v3"
    >
      {showShortcuts && <HomePathShortcuts />}
      {showCatalog && <HomeExploreSection excludePreviewHrefs={excludePreviewHrefs} />}
    </div>
  );
}
