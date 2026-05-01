export default function KpiCard({
  label,
  value,
  sub,
  color = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "slate" | "green" | "blue" | "red" | "orange";
}) {
  const colors = {
    slate: "bg-white border-slate-200 text-slate-800",
    green: "bg-green-50 border-green-200 text-green-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    red: "bg-red-50 border-red-200 text-red-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}
