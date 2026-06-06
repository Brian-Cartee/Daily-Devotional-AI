import { useCallback, useEffect, useState } from "react";
import { ProConnectSheet } from "@/components/ProConnectSheet";
import { shouldPromptIdentityConnect } from "@/lib/identity";
import { isProVerifiedLocally } from "@/lib/proStatus";

/** Shows post-Pro email connect when Apple/Play Pro has no real email on file. */
export function IdentityConnectHost() {
  const [open, setOpen] = useState(false);

  const evaluate = useCallback(() => {
    if (!isProVerifiedLocally()) {
      setOpen(false);
      return;
    }
    setOpen(shouldPromptIdentityConnect());
  }, []);

  useEffect(() => {
    evaluate();
    window.addEventListener("sp-pro-updated", evaluate);
    return () => window.removeEventListener("sp-pro-updated", evaluate);
  }, [evaluate]);

  return (
    <ProConnectSheet
      open={open}
      onClose={() => setOpen(false)}
      onConnected={() => setOpen(false)}
    />
  );
}
