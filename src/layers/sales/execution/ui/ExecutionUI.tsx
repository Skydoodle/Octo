/* eslint-disable react-refresh/only-export-components -- shared sales UI module intentionally re-exports established primitives */
import type { ReactNode } from "react";
import {
  Badge,
  PageState,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "../../../sales/ui/CRMUI";
export { Badge, PageState, buttonPrimary, buttonSecondary, inputClass };
export const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
export const datetime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export function FilterBox({ children }: { children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </section>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-crimson/25 bg-crimson/5 text-crimson" : "border-emerald-600/20 bg-emerald-600/10 text-emerald-800"}`}
    >
      {children}
    </div>
  );
}
