import { Suspense } from "react";
import QuotaPageSkeleton from "./components/QuotaPageSkeleton";
import QuotaTracker from "../usage/components/ProviderLimits";

export default function QuotaPage() {
  return (
    <Suspense fallback={<QuotaPageSkeleton />}>
      <QuotaTracker />
    </Suspense>
  );
}
