'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Field, INPUT_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

/**
 * Edit, disable and delete controls for a link.
 *
 * Delete requires typing the word "delete" rather than a browser confirm():
 * confirms are trivially dismissed by reflex, and this action is irreversible.
 */

export function LinkActions({
  linkId,
  destinationUrl,
  title,
  disabled,
}: {
  linkId: string;
  destinationUrl: string;
  title: string | null;
  disabled: boolean;
}) {
  const router = useRouter();

  const [url, setUrl] = useState(destinationUrl);
  const [linkTitle, setLinkTitle] = useState(title ?? '');
  const [pending, setPending] = useState<'save' | 'toggle' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  async function patch(body: Record<string, unknown>, action: 'save' | 'toggle') {
    setPending(action);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload: unknown = await response.json();
        setError(readMessage(payload) ?? 'Could not save your changes.');
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError('Could not reach Zurl. Check your connection and try again.');
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (confirmText.trim().toLowerCase() !== 'delete') return;

    setPending('delete');
    setError(null);

    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      if (!response.ok) {
        setError('Could not delete this link.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach Zurl. Check your connection and try again.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-medium text-ink">Edit</h3>
        <p className="mt-1 text-xs text-subtle">
          The short code cannot be changed, because that would break links already shared. The
          destination can.
        </p>

        <div className="mt-4 space-y-4">
          <Field id="edit-url" label="Destination URL" required>
            <input
              id="edit-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              className={cn(INPUT_CLASS, 'h-11')}
            />
          </Field>

          <Field id="edit-title" label="Title">
            <input
              id="edit-title"
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
              placeholder="A label to find this later"
              className={cn(INPUT_CLASS, 'h-11')}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => patch({ url, title: linkTitle || null }, 'save')}
              disabled={pending !== null}
            >
              {pending === 'save' ? 'Saving…' : 'Save changes'}
            </Button>
            {saved ? <span className="text-sm text-success">Saved</span> : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-medium text-ink">
          {disabled ? 'Enable link' : 'Disable link'}
        </h3>
        <p className="mt-1 text-xs text-subtle">
          {disabled
            ? 'Re-enable this link so it redirects again.'
            : 'Stop this link redirecting without deleting it. The short code stays reserved and you can re-enable it at any time.'}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => patch({ disabled: !disabled }, 'toggle')}
          disabled={pending !== null}
        >
          {pending === 'toggle' ? 'Working…' : disabled ? 'Enable' : 'Disable'}
        </Button>
      </div>

      <div className="rounded-lg border border-danger/30 bg-danger-muted/30 p-5">
        <h3 className="text-sm font-medium text-ink">Delete link</h3>
        <p className="mt-1 text-xs text-subtle">
          Permanently removes this link and its click history. Anyone who has the link will get a
          404. This cannot be undone.
        </p>

        {showDelete ? (
          <div className="mt-4 space-y-3">
            <Field id="confirm-delete" label="Type delete to confirm" required>
              <input
                id="confirm-delete"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoComplete="off"
                className={cn(INPUT_CLASS, 'h-11 max-w-xs')}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                onClick={remove}
                disabled={pending !== null || confirmText.trim().toLowerCase() !== 'delete'}
              >
                {pending === 'delete' ? 'Deleting…' : 'Delete permanently'}
              </Button>
              <Button variant="ghost" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" className="mt-4" onClick={() => setShowDelete(true)}>
            Delete this link
          </Button>
        )}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}

function readMessage(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object' &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }
  return null;
}
