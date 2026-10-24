export default function ThinkingIndicator() {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden="true" className="flex gap-1">
        <span className="size-2 animate-pulse rounded-full bg-sage" />
        <span className="size-2 animate-pulse rounded-full bg-sage [animation-delay:200ms]" />
        <span className="size-2 animate-pulse rounded-full bg-sage [animation-delay:400ms]" />
      </span>
      CommonGround is thinking. This can take several seconds.
    </div>
  );
}
