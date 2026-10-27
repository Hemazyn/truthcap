"use client";

import { HomePage } from "@/components/HomePage";
import { useStartRecord } from "@/lib/useStartRecord";

export function HomeScreen() {
  const startRecord = useStartRecord();

  return <HomePage onStart={startRecord} />;
}
