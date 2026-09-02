import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import QuotaTracker from "../usage/components/ProviderLimits";

export default function QuotaPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <QuotaTracker />
    </Suspense>
  );
}
