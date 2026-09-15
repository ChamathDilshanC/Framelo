import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "Projects",
  description: "Your Framelo projects.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
