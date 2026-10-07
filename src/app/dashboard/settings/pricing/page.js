import { redirect } from "next/navigation";

// Pricing moved into the dashboard (sidebar → Pricing).
export default function LegacyPricingSettingsPage() {
  redirect("/dashboard/pricing");
}
