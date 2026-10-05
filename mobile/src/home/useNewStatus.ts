import { useEffect, useState } from "react";

/** Keep a server-issued launch badge from surviving past its exact expiry. */
export function useNewStatus(isNew?: boolean, newUntil?: string | null): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const until = newUntil ? Date.parse(newUntil) : NaN;
    if (!Number.isFinite(until)) return;
    const delay = Math.max(0, until - Date.now() + 5);
    const timer = setTimeout(() => setNow(Date.now()), Math.min(delay, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [newUntil]);
  return Boolean(isNew && newUntil && Date.parse(newUntil) > now);
}
