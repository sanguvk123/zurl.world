'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Badge, Button } from '@/components/ui';
import { truncateUrl } from '@/lib/links/url';
import { displayShortUrl } from '@/lib/seo/site';

type Report = {
  reportId: string;
  category: string;
  details: string | null;
  createdAt: string;
  linkId: string;
  shortCode: string;
  destinationUrl: string;
  disabled: boolean;
};

const CATEGORY_TONE: Record<string, 'danger' | 'warning' | 'neutral'> = {
  phishing: 'danger',
  malware: 'danger',
  illegal: 'danger',
  spam: 'warning',
  other: 'neutral',
};

export function AdminModeration({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(reportId: string, action: 'disable' | 'dismiss' | 'enable') {
    setPending(reportId);
    setError(null);

    try {
      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });

      if (!response.ok) {
        setError('That action could not be completed.');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.reportId} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={CATEGORY_TONE[report.category] ?? 'neutral'}>
                    {report.category}
                  </Badge>
                  <span className="font-mono text-sm text-ink">
                    {displayShortUrl(report.shortCode)}
                  </span>
                  {report.disabled ? <Badge tone="danger">Already disabled</Badge> : null}
                </div>

                <p className="mt-1.5 text-xs break-all text-subtle">
                  {truncateUrl(report.destinationUrl, 100)}
                </p>

                {report.details ? (
                  <p className="mt-2 rounded border border-border bg-canvas p-2 text-xs leading-5 text-muted">
                    {report.details}
                  </p>
                ) : null}

                <p className="mt-1.5 text-2xs text-faint">
                  Reported {new Date(report.createdAt).toLocaleString('en-GB')}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {report.disabled ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending === report.reportId}
                    onClick={() => act(report.reportId, 'enable')}
                  >
                    Re-enable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={pending === report.reportId}
                    onClick={() => act(report.reportId, 'disable')}
                  >
                    Disable link
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending === report.reportId}
                  onClick={() => act(report.reportId, 'dismiss')}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
