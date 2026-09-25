'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Field, INPUT_CLASS, Select } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

/**
 * Standalone QR code generator.
 *
 * Debounces input and fetches the SVG from the server, which owns the encoder.
 * Works with no account.
 */

const LEVELS = [
  { value: 'L', label: 'Low — about 7% recovery' },
  { value: 'M', label: 'Medium — about 15% recovery (recommended)' },
  { value: 'Q', label: 'Quartile — about 25% recovery' },
  { value: 'H', label: 'High — about 30% recovery' },
] as const;

export function QrGenerator() {
  const [content, setContent] = useState('');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const requestId = useRef(0);

  /**
   * The rendered result is keyed by the exact request it answers, so changing
   * the content or level invalidates the previous QR code during render
   * instead of through a setState call inside the effect.
   */
  const requestKey = `${content.trim()}::${level}`;
  const [result, setResult] = useState<{
    key: string;
    svg: string | null;
    error: string | null;
  }>({ key: '', svg: null, error: null });

  const current = result.key === requestKey ? result : { key: requestKey, svg: null, error: null };
  const svg = current.svg;
  const error = current.error;
  const pending = content.trim().length > 0 && current.svg === null && current.error === null;

  useEffect(() => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return;

    const id = ++requestId.current;
    const key = `${trimmed}::${level}`;

    // Debounce so typing does not fire a request per keystroke.
    const timer = setTimeout(() => {
      fetch(`/api/qr?content=${encodeURIComponent(trimmed)}&level=${level}`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              response.status === 400
                ? 'That content is too long to encode in a QR code.'
                : 'Could not generate a QR code.',
            );
          }
          return response.text();
        })
        .then((text) => {
          if (id !== requestId.current) return;
          setResult({ key, svg: text, error: null });
        })
        .catch((cause: unknown) => {
          if (id !== requestId.current) return;
          setResult({
            key,
            svg: null,
            error: cause instanceof Error ? cause.message : 'Could not generate a QR code.',
          });
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [content, level]);

  const filename = safeFilename(content);

  async function downloadPng(size: number) {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Could not render QR code'));
        image.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.imageSmoothingEnabled = false;
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);

      const anchor = document.createElement('a');
      anchor.download = `${filename}-${size}.png`;
      anchor.href = canvas.toDataURL('image/png');
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = `${filename}.svg`;
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <Field
          id="qr-content"
          label="URL or text"
          hint="Anything you want the code to contain. Shorter content makes a code that scans more easily."
          required
        >
          <input
            id="qr-content"
            type="text"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="https://example.com"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={cn(INPUT_CLASS, 'h-12 text-base')}
          />
        </Field>

        <Field
          id="qr-level"
          label="Error correction"
          hint="Higher levels survive more damage but make the code denser."
        >
          <Select
            id="qr-level"
            value={level}
            onChange={(event) => setLevel(event.target.value as 'L' | 'M' | 'Q' | 'H')}
          >
            {LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        {svg ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadPng(512)}
              className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => downloadPng(1024)}
              className="inline-flex h-10 items-center rounded-md bg-surface-raised px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
            >
              PNG 1024px
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Download SVG
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex justify-center lg:justify-end">
        <div>
          <div
            className={cn(
              'flex h-56 w-56 items-center justify-center rounded-xl border',
              svg ? 'border-transparent bg-white p-3' : 'border-dashed border-border-strong bg-surface/50',
            )}
          >
            {svg ? (
              <div
                className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                // Server-generated from our own encoder: geometry only, no
                // user-controlled markup.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <p className="px-4 text-center text-sm text-faint">
                {pending ? 'Generating…' : 'Your QR code will appear here.'}
              </p>
            )}
          </div>
          {svg ? (
            <p className="mt-2 text-center text-xs text-subtle">Scan to test before printing.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function safeFilename(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length === 0) return 'zurl-qr';

  try {
    const host = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname;
    return `qr-${host.replace(/[^a-z0-9.-]/gi, '')}`.slice(0, 48);
  } catch {
    return 'zurl-qr';
  }
}
