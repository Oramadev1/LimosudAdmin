import { useCallback, useRef, useState } from "react";

export function useSubmitLock() {
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const runOnce = useCallback(async <T,>(action: () => Promise<T> | T): Promise<T | false> => {
    if (inFlightRef.current) {
      return false;
    }

    inFlightRef.current = true;
    setBusy(true);

    try {
      return await action();
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, []);

  return { runOnce, busy };
}
