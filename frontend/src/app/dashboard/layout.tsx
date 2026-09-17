import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequireAuth } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
