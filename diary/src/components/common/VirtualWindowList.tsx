import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type VirtualWindowListProps<T> = {
  items: T[];
  getItemKey: (item: T, index: number) => string;
  estimateSize: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
};

type MeasuredVirtualItemProps = {
  itemKey: string;
  top: number;
  onHeightChange: (itemKey: string, height: number) => void;
  children: ReactNode;
};

function MeasuredVirtualItem({
  itemKey,
  top,
  onHeightChange,
  children,
}: MeasuredVirtualItemProps) {
  const itemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = itemRef.current;
    if (!node) return;

    const updateHeight = () => {
      onHeightChange(itemKey, node.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [itemKey, onHeightChange]);

  return (
    <div
      ref={itemRef}
      className="absolute inset-x-0"
      style={{ top }}
    >
      {children}
    </div>
  );
}

export default function VirtualWindowList<T>({
  items,
  getItemKey,
  estimateSize,
  renderItem,
  gap = 16,
  overscan = 720,
  className,
}: VirtualWindowListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({
    scrollY: 0,
    viewportHeight: 0,
  });
  const [containerTop, setContainerTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  const handleHeightChange = useCallback((itemKey: string, height: number) => {
    setMeasuredHeights((current) => {
      if (current[itemKey] === height) return current;
      return {
        ...current,
        [itemKey]: height,
      };
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frameId = 0;

    const updateMetrics = () => {
      frameId = 0;
      const node = containerRef.current;
      const nextContainerTop = node
        ? window.scrollY + node.getBoundingClientRect().top
        : 0;

      setScrollState((current) => {
        const next = {
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
        };

        if (
          current.scrollY === next.scrollY &&
          current.viewportHeight === next.viewportHeight
        ) {
          return current;
        }

        return next;
      });
      setContainerTop((current) =>
        Math.abs(current - nextContainerTop) < 1 ? current : nextContainerTop,
      );
    };

    const requestUpdate = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateMetrics);
    };

    updateMetrics();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateContainerTop = () => {
      const node = containerRef.current;
      if (!node) return;

      const nextTop = window.scrollY + node.getBoundingClientRect().top;
      setContainerTop((current) => (Math.abs(current - nextTop) < 1 ? current : nextTop));
    };

    updateContainerTop();
    window.addEventListener("resize", updateContainerTop);

    return () => {
      window.removeEventListener("resize", updateContainerTop);
    };
  }, [items.length]);

  if (items.length === 0) {
    return <div ref={containerRef} className={className} />;
  }

  const currentScrollTop = Math.max(0, scrollState.scrollY - containerTop);
  const viewportBottom = currentScrollTop + scrollState.viewportHeight;

  const layouts: Array<{
    index: number;
    itemKey: string;
    top: number;
    size: number;
  }> = [];

  let totalHeight = 0;

  items.forEach((item, index) => {
    const itemKey = getItemKey(item, index);
    const estimatedHeight =
      typeof estimateSize === "function" ? estimateSize(item, index) : estimateSize;
    const size = measuredHeights[itemKey] ?? estimatedHeight;

    layouts.push({
      index,
      itemKey,
      top: totalHeight,
      size,
    });

    totalHeight += size + gap;
  });

  if (items.length > 0) {
    totalHeight -= gap;
  }

  let startIndex = 0;
  while (
    startIndex < layouts.length &&
    layouts[startIndex].top + layouts[startIndex].size < currentScrollTop - overscan
  ) {
    startIndex += 1;
  }

  let endIndex = startIndex;
  while (
    endIndex < layouts.length &&
    layouts[endIndex].top < viewportBottom + overscan
  ) {
    endIndex += 1;
  }

  const visibleItems = layouts.slice(startIndex, Math.max(startIndex + 1, endIndex));

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: totalHeight, position: "relative" }}
    >
      {visibleItems.map((layout) => (
        <MeasuredVirtualItem
          key={layout.itemKey}
          itemKey={layout.itemKey}
          top={layout.top}
          onHeightChange={handleHeightChange}
        >
          {renderItem(items[layout.index], layout.index)}
        </MeasuredVirtualItem>
      ))}
    </div>
  );
}
