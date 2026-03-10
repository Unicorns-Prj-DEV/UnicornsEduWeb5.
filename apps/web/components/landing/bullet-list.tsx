interface BulletListProps {
  points: readonly string[];
}

export function BulletList({ points }: BulletListProps) {
  return (
    <ul className="space-y-2.5">
      {points.map((point) => (
        <li key={point} className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="mt-1 inline-block h-2 w-2 rounded-full bg-primary"
          />
          <span className="text-text-secondary">{point}</span>
        </li>
      ))}
    </ul>
  );
}
