import { useEffect, useRef } from "react";

type InfiniteScrollTriggerProps = {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
};

export default function InfiniteScrollTrigger({
  hasMore,
  loading = false,
  onLoadMore,
}: InfiniteScrollTriggerProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      triggeredRef.current = false;
    }
  }, [loading, hasMore]);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || loading || triggeredRef.current) return;
        triggeredRef.current = true;
        onLoadMore();
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) return null;

  return <div ref={anchorRef} className="h-8 w-full" aria-hidden="true" />;
}
