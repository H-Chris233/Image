type Props = {
  compact?: boolean;
};

export default function ModelBadge({ compact = false }: Props) {
  if (compact) {
    return (
      <span className="inline-flex items-center rounded-md bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
        gpt-image-2
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-2.5 py-1 text-xs font-medium text-on-primary-container">
      <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
      <span>image2</span>
      <span className="text-on-primary-container/60">gpt-image-2</span>
    </span>
  );
}
