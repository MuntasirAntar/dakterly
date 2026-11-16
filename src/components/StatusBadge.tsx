const STYLES: Record<string, { label: string; className: string }> = {
  BOOKED: { label: "Booked", className: "bg-teal-50 text-teal-800" },
  CHECKED_IN: { label: "Checked in", className: "bg-amber-50 text-amber-800" },
  IN_PROGRESS: { label: "With the doctor", className: "bg-indigo-50 text-indigo-800" },
  COMPLETED: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  CANCELLED: { label: "Cancelled", className: "bg-red-50 text-red-700" },
  NO_SHOW: { label: "No-show", className: "bg-orange-50 text-orange-800" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>{style.label}</span>;
}
