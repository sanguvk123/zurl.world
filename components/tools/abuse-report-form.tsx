'use client';

import { useState } from 'react';
import { Alert, Button, Field, INPUT_CLASS, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

const CATEGORIES = [
  { value: 'phishing', label: 'Phishing — imitates a real site to steal credentials' },
  { value: 'malware', label: 'Malware — distributes harmful software' },
  { value: 'spam', label: 'Spam — unsolicited bulk messaging' },
  { value: 'illegal', label: 'Illegal content' },
  { value: 'other', label: 'Something else' },
] as const;

export function AbuseReportForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [category, setCategory] = useState<string>('phishing');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');

  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setErrors({});
    setGeneral(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, category, details: details || undefined, email: email || undefined }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const parsed = readError(payload);
        if (parsed.fields) setErrors(parsed.fields);
        else if (parsed.field) setErrors({ [parsed.field]: parsed.message });
        else setGeneral(parsed.message);
        return;
      }

      setSubmitted(true);
    } catch {
      setGeneral('Could not submit the report. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <Alert tone="success">
        <p className="font-medium">Report received.</p>
        <p className="mt-1">
          Thank you. This has been sent to our moderation queue and will be reviewed. We do not send
          updates on individual reports.
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        id="report-code"
        label="Short link"
        hint="Paste the Zurl link, or just its code."
        error={errors.code}
        required
      >
        <input
          id="report-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="zurl.world/a8K3xPq"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={errors.code ? true : undefined}
          className={cn(INPUT_CLASS, 'h-11')}
        />
      </Field>

      <Field id="report-category" label="What is wrong with it?" error={errors.category} required>
        <Select
          id="report-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="report-details"
        label="Details"
        hint="Anything that helps us assess this quickly — what you saw, and where you encountered the link."
        error={errors.details}
      >
        <Textarea
          id="report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={4}
          maxLength={2000}
        />
      </Field>

      <Field
        id="report-email"
        label="Your email"
        hint="Only if you are willing to be contacted about this report. Reports are accepted without it."
        error={errors.email}
      >
        <input
          id="report-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className={cn(INPUT_CLASS, 'h-11')}
        />
      </Field>

      {general ? <Alert tone="danger">{general}</Alert> : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit report'}
      </Button>
    </form>
  );
}

function readError(payload: unknown): {
  message: string;
  field?: string;
  fields?: Record<string, string>;
} {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object'
  ) {
    const error = payload.error as Record<string, unknown>;
    const fields =
      error.fields && typeof error.fields === 'object'
        ? (error.fields as Record<string, string>)
        : undefined;

    return {
      message: typeof error.message === 'string' ? error.message : 'Could not submit the report.',
      ...(typeof error.field === 'string' ? { field: error.field } : {}),
      ...(fields ? { fields } : {}),
    };
  }
  return { message: 'Could not submit the report.' };
}
