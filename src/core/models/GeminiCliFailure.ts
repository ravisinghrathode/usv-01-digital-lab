/**
 * Redacted, deterministic classification of headless Gemini CLI failures.
 *
 * Node execFile's default Error.message embeds the full argv. If --prompt
 * ever contains an engineering payload, that message is NOT safe to log.
 * Classify only subprocess stderr/stdout and bounded status metadata; never
 * emit raw CLI output, prompts, API credentials or model responses.
 */
type CommandFailure = Error & {
  code?: string | number;
  stdout?: unknown;
  stderr?: unknown;
  killed?: boolean;
  signal?: string;
};

const toBoundedText = (x: unknown) =>
  typeof x === 'string' ? x.slice(-16_384) : '';

export function classifyGeminiCliFailure(value: unknown): Error {
  const e: CommandFailure = value instanceof Error ?
    value as CommandFailure : new Error('unrecognized Gemini CLI failure');
  const code = typeof e.code === 'number' && Number.isInteger(e.code) ?
    String(e.code) :
    typeof e.code === 'string' && /^[A-Z_0-9]{1,36}$/.test(e.code) ?
      e.code : 'UNKNOWN';
  // stderr is the diagnostic channel. stdout may contain a JSON error
  // envelope, but never use successful responses as diagnostic evidence.
  const detail = (toBoundedText(e.stderr) + '\n' + toBoundedText(e.stdout));
  // For errors we constructed internally (not Node's argv-echoing
  // "Command failed: ..."), allow known fixed error phrases to be inspected.
  const internal = !detail.trim() && !/^Command failed:/i.test(e.message) ?
    toBoundedText(e.message) : '';
  const signal = (detail + '\n' + internal).slice(-32_768);

  if (/\b(?:quota exhausted|quota exceeded|resource_exhausted|rate limit|429|too many requests|usage limit reached|limit exceeded)\b/i.test(signal)) {
    return new Error('USV_QUOTA_WAIT: GEMINI_PROVIDER_QUOTA_EXHAUSTED');
  }
  if (/\b(?:oauth|authentication|authenticate|FatalAuthenticationError|not logged in|login required|login|sign in|not signed in|auth type|enforced authentication type|no authentication configured|session expired|invalid credentials)\b/i.test(signal)) {
    return new Error('GEMINI_CLI_AUTH_REQUIRED: personal Google OAuth session missing or incompatible; local sign-in required');
  }
  if (/\b(?:model not found|model unavailable|model is not available|model not supported|unsupported model|model access denied|does not have access to model|unknown model|requested model)\b/i.test(signal)) {
    return new Error('GEMINI_CLI_MODEL_UNAVAILABLE: required model not verified in current CLI session');
  }
  if (/\b(?:unknown argument|unknown option|invalid argument|invalid values|unrecognized option|unrecognized argument)\b/i.test(signal) || code === '42') {
    return new Error('GEMINI_CLI_ARGUMENT_REJECTED: headless CLI flags/version incompatible; exit=' + code);
  }
  if (/\b(?:ENOENT|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network unreachable|service unavailable|connection refused|request timed out|HTTP[ :]*50[234])\b/i.test(signal) ||
      ['ENOENT', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(code) ||
      e.killed === true || e.signal === 'SIGTERM' || e.signal === 'SIGKILL') {
    return new Error('GEMINI_CLI_TRANSPORT_UNAVAILABLE: local CLI or network temporarily unavailable; exit=' + code);
  }
  if (/Gemini CLI did not emit the documented JSON envelope|Gemini CLI returned no response text|Gemini CLI provider error:|invalid JSON output/i.test(signal)) {
    return new Error('GEMINI_CLI_INVALID_OUTPUT: no usable, verified JSON response; provider evidence rejected');
  }
  return new Error('GEMINI_CLI_EXIT_FAILED: exit=' + code +
    '; diagnostic_category=UNKNOWN; raw stderr/argv suppressed');
}
