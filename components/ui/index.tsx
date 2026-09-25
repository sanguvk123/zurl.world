/**
 * Design system primitives.
 *
 * Small, typed, server-renderable components. None of these are client
 * components — interactivity lives in the few places that genuinely need it.
 */

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export { Button, ButtonLink } from './button';
export type { ButtonProps, ButtonLinkProps, ButtonVariant, ButtonSize } from './button';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Container({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8', className)} {...props}>
      {children}
    </div>
  );
}

/** Narrower container for long-form reading (articles, legal pages). */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'max-w-2xl text-[0.9375rem] leading-7 text-muted',
        '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:tracking-tight',
        '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink',
        '[&_p]:mb-4',
        '[&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-faint',
        '[&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:marker:text-faint',
        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-hover',
        '[&_strong]:font-semibold [&_strong]:text-ink',
        '[&_code]:rounded [&_code]:bg-surface-raised [&_code]:px-1.5 [&_code]:py-0.5',
        '[&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ink',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-muted border-border-strong',
  accent: 'bg-accent-muted text-accent border-accent/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger-muted text-danger border-danger/30',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5',
        'text-2xs font-medium tracking-wide uppercase',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'border-border-strong bg-surface-raised text-muted',
  success: 'border-success/30 bg-success/5 text-success',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  danger: 'border-danger/30 bg-danger-muted text-danger',
};

/**
 * Status message.
 *
 * `role="alert"` makes screen readers announce it immediately — essential for
 * form errors. Tone is never the only signal: every alert carries text.
 */
export function Alert({
  tone = 'info',
  className,
  children,
  role = tone === 'danger' ? 'alert' : 'status',
}: {
  tone?: AlertTone;
  className?: string;
  children: ReactNode;
  role?: 'alert' | 'status';
}) {
  return (
    <div
      role={role}
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        ALERT_TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export const INPUT_CLASS =
  'w-full rounded-md border border-border-strong bg-surface-raised px-3 text-ink ' +
  'placeholder:text-faint transition-colors ' +
  'hover:border-border-strong focus:border-accent focus:outline-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent ' +
  'disabled:opacity-50 aria-[invalid=true]:border-danger';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(INPUT_CLASS, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(INPUT_CLASS, 'min-h-24 py-2.5', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(INPUT_CLASS, 'h-11 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Field wrapper: label, control, optional hint and error.
 *
 * Wires `htmlFor`, `aria-describedby` and `aria-invalid` so every control is
 * announced correctly without each caller remembering to do it.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-faint">Optional</span>
        )}
      </label>

      {children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="flex items-start gap-1 text-xs text-danger">
          {/* An icon plus text: the error is never signalled by colour alone. */}
          <span aria-hidden="true">✕</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed',
        'border-border-strong bg-surface/50 px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-subtle">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-medium tracking-widest text-accent uppercase">{eyebrow}</p>
      ) : null}
      <Tag
        className={cn(
          'font-semibold tracking-tight text-ink text-balance',
          Tag === 'h1' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-[1.75rem]',
        )}
      >
        {title}
      </Tag>
      {description ? (
        <p className="mt-3 text-[0.9375rem] leading-7 text-muted text-pretty">{description}</p>
      ) : null}
    </div>
  );
}
