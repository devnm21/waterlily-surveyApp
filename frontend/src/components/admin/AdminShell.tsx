"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BrandLoader } from "@/components/BrandLoader";
import { AdminSidebarProvider, useAdminSidebar } from "@/contexts/admin/SidebarContext";

function AdminShellFrame({ children }: { children: ReactNode }) {
  const { isLoading } = useAdminSidebar();

  if (isLoading) {
    return <BrandLoader />;
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-stage">
        <header className="admin-stage__header">
          <p className="admin-stage__brand">SouperSurveyForm</p>
        </header>
        <div className="admin-stage__body">{children}</div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminSidebarProvider>
      <AdminShellFrame>{children}</AdminShellFrame>
    </AdminSidebarProvider>
  );
}
