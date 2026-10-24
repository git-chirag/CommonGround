/**
 * Deployment configuration.
 *
 * NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time, so changing them on Vercel needs a redeploy.
 * They are public by design: never put secrets in them.
 */

/**
 * Parse NEXT_PUBLIC_DEMO_MODE. Safe default: anything other than an explicit "false"/"0"/"off"/"no" means demo mode
 * is ON, so a public build that forgets the variable never tries to reach a backend.
 */
export function parseDemoMode(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(v);
}

/**
 * True when live AI responses are disabled (public prototype). In demo mode the app makes no chat requests at all.
 * Local development with the FastAPI backend: set NEXT_PUBLIC_DEMO_MODE=false in frontend/.env.local.
 */
export function isDemoMode(): boolean {
  // Must be written as a literal `process.env.NEXT_PUBLIC_...` so Next.js can inline it.
  return parseDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE);
}
