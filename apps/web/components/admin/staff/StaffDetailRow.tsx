export default function StaffDetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 font-medium text-text-secondary sm:w-36">{label}</dt>
      <dd className="min-w-0 text-text-primary">{value ?? "—"}</dd>
    </div>
  );
}
