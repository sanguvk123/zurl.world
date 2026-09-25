/**
 * Charts.
 *
 * Plain SVG, rendered on the server. A charting library would be the single
 * largest client bundle in the application for three simple visualisations,
 * and none of these need interactivity.
 *
 * Accessibility: every chart carries a text alternative, and the bar lists
 * show their numeric values directly, so no information is conveyed by
 * geometry alone.
 */

import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Line chart
// ---------------------------------------------------------------------------

export function LineChart({
  values,
  label,
  className,
  height = 120,
}: {
  values: readonly number[];
  label: string;
  className?: string;
  height?: number;
}) {
  if (values.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-border-strong text-sm text-faint',
          className,
        )}
        style={{ height }}
      >
        No clicks yet
      </div>
    );
  }

  const width = 600;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = index * stepX;
    // Leave 8px of headroom so the peak is not clipped by the viewBox.
    const y = height - 8 - (value / max) * (height - 16);
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label={`${label}. ${total.toLocaleString()} clicks in total, peaking at ${max.toLocaleString()}.`}
      >
        <defs>
          <linearGradient id="zurl-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#zurl-area)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar list
// ---------------------------------------------------------------------------

export type BarItem = { label: string; count: number };

export function BarList({
  items,
  className,
  emptyMessage = 'No data yet',
}: {
  items: readonly BarItem[];
  className?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className={cn('text-sm text-faint', className)}>{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <dl className={cn('space-y-2', className)}>
      {items.map((item) => {
        const percentage = Math.round((item.count / max) * 100);
        return (
          <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="relative min-w-0">
              {/*
                The bar is decorative; the label and count below are the real
                content, so the information is never colour- or width-only.
              */}
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-accent-muted"
                style={{ width: `${percentage}%` }}
                aria-hidden="true"
              />
              <dt className="relative truncate px-2 py-1 text-sm text-ink">{item.label}</dt>
            </div>
            <dd className="font-mono text-sm text-muted tabular-nums">
              {item.count.toLocaleString()}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Stat
// ---------------------------------------------------------------------------

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-2xs font-semibold tracking-widest text-faint uppercase">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold text-ink tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}
