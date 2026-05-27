/** Session flag read by LandingHome to scroll to #explore-section */
export const SCROLL_TO_EXPLORE_KEY = "scrollToExplore";

/** Persisted so HomeExploreSection opens the full paths grid on return */
export const HOME_EXPLORE_OPEN_KEY = "sp_home_explore_open";

export function markReturnToHomePaths(): void {
  sessionStorage.setItem(SCROLL_TO_EXPLORE_KEY, "1");
  try {
    localStorage.setItem(HOME_EXPLORE_OPEN_KEY, "1");
  } catch {
    /* noop */
  }
}

type NavigateFn = (to: string, options?: { replace?: boolean }) => void;

/** Navigate home and scroll to the More paths section (not page top). */
export function navigateBackToHomePaths(
  navigate: NavigateFn,
  options?: { replace?: boolean },
): void {
  markReturnToHomePaths();
  navigate("/", options?.replace ? { replace: true } : undefined);
}
