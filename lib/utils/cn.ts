/**
 * Minimal class-name joiner.
 *
 * `clsx`/`tailwind-merge` would be two dependencies for what is eight lines.
 * Conflicting Tailwind classes are avoided by construction (variants are
 * mutually exclusive) rather than resolved at runtime.
 */
export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];

  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }

  return out.join(' ');
}
