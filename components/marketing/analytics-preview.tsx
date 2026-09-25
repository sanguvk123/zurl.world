import { BarList, LineChart } from '@/components/charts';

/**
 * Static analytics preview shown on the homepage.
 *
 * The numbers are clearly framed as an example of the interface, not as
 * product usage statistics or customer data. Nothing here is presented as a
 * real metric about Zurl.
 */

const SERIES = [
  12, 18, 15, 24, 31, 28, 22, 19, 26, 34, 41, 38, 45, 52, 47, 39, 44, 58, 63, 55, 49, 61, 72, 68,
  74, 81, 77, 69, 84, 92,
];

const COUNTRIES = [
  { label: 'India', count: 486 },
  { label: 'United States', count: 372 },
  { label: 'United Kingdom', count: 168 },
  { label: 'Germany', count: 134 },
  { label: 'Canada', count: 124 },
];

const DEVICES = [
  { label: 'Mobile', count: 742 },
  { label: 'Desktop', count: 486 },
  { label: 'Tablet', count: 56 },
];

export function AnalyticsPreview() {
  return (
    <figure className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-2xs font-semibold tracking-widest text-faint uppercase">
            Total clicks
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink tabular-nums">1,284</p>
        </div>
        <p className="text-xs text-subtle">Last 30 days</p>
      </div>

      <div className="mt-5">
        <LineChart values={SERIES} label="Clicks per day over the last 30 days" />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-2xs font-semibold tracking-widest text-faint uppercase">
            Top countries
          </h3>
          <BarList items={COUNTRIES} className="mt-3" />
        </div>
        <div>
          <h3 className="text-2xs font-semibold tracking-widest text-faint uppercase">Devices</h3>
          <BarList items={DEVICES} className="mt-3" />
        </div>
      </div>

      <figcaption className="mt-5 border-t border-border pt-3 text-xs text-faint">
        Example data, shown to illustrate the analytics interface.
      </figcaption>
    </figure>
  );
}
