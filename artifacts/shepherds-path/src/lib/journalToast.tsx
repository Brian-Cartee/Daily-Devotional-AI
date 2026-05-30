import { ToastAction } from "@/components/ui/toast";

/** Toast after saving to journal — optional navigation to /journal */
export function journalSavedToast(onOpenJournal?: () => void) {
  const open = onOpenJournal ?? (() => {
    window.location.href = "/journal";
  });
  return {
    description: "Saved to your Journal.",
    action: (
      <ToastAction altText="Open Journal" onClick={open}>
        Open Journal
      </ToastAction>
    ),
  } as const;
}
