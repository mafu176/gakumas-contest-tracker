export default function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
