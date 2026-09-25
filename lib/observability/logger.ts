/**
 * Structured logging.
 *
 * Emits single-line JSON so a log aggregator can parse it without a custom
 * grok pattern. No transport dependency: stdout is the interface, and the
 * platform collects it.
 *
 * Privacy: never pass raw IPs, passwords, tokens, API keys or full referrer
 * URLs. `redact` strips the obvious offenders as a backstop, but the real rule
 * is not to log them in the first place.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in LEVEL_ORDER) return configured;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/** Field names whose values are never safe to emit. */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'ip',
  'ipaddress',
  'email',
]);

function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : value;
  }
  return out;
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel()]) return;

  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...redact(fields),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit('debug', event, fields),
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields),
};

/**
 * Product analytics events.
 *
 * Currently these go to the same structured log stream — no third-party
 * analytics vendor is wired in, and the privacy page says so. Swapping in a
 * provider means changing this one function.
 */
export type ProductEvent =
  | 'link_created'
  | 'link_copied'
  | 'qr_generated'
  | 'signup'
  | 'login'
  | 'abuse_reported';

export function trackEvent(event: ProductEvent, fields: LogFields = {}): void {
  emit('info', `product.${event}`, fields);
}
