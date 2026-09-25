/**
 * API serialisation.
 *
 * A single place that decides which link fields are exposed publicly. Notably
 * the password hash and the creator IP hash are never included, and the
 * presence of a password is reported as a boolean.
 */

import type { Link } from '@/lib/db/schema';
import { linkState } from '@/lib/links/service';

export type SerialisedLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  custom: boolean;
  state: 'active' | 'expired' | 'disabled';
  hasPassword: boolean;
  clicks: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  lastClickedAt: string | null;
};

export function serialiseLink(link: Link): SerialisedLink {
  return {
    id: link.id,
    shortCode: link.shortCode,
    destinationUrl: link.destinationUrl,
    title: link.title,
    custom: link.isCustomAlias === 1,
    state: linkState(link),
    hasPassword: link.passwordHash !== null,
    clicks: link.clickCount,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    expiresAt: link.expiresAt?.toISOString() ?? null,
    lastClickedAt: link.lastClickedAt?.toISOString() ?? null,
  };
}
