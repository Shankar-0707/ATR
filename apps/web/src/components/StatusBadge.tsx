const statusClass: Record<string, string> = {
  pending: "badge pending",
  active: "badge active",
  completed: "badge ok",
  failed: "badge err",
  dead: "badge err",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={statusClass[status] ?? "badge"}>{status}</span>
  );
}
