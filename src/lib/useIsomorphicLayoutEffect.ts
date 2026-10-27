import { useEffect, useLayoutEffect } from "react";

/**
 * Runs before the browser paints on the client, and falls back to `useEffect`
 * on the server where layout effects do not exist. Rehydrating the store this
 * way means the first paint already shows this device's records instead of
 * flashing the server's empty state.
 */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
