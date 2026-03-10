interface FeatureCardProps {
  title: string;
  description: string;
  animationDelay: string;
}

export function FeatureCard({
  title,
  description,
  animationDelay,
}: FeatureCardProps) {
  return (
    <article
      className="motion-fade-up motion-hover-lift rounded-xl border border-border-default bg-bg-surface p-5"
      style={{ animationDelay }}
    >
      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-text-secondary">{description}</p>
    </article>
  );
}
