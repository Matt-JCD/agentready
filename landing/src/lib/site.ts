export const PF = 'https://prefactor.tech';
export const GRFA = 'https://www.getreadyforagents.com';

/** The Next.js checker app this landing page links into. */
export const APP =
  import.meta.env.PUBLIC_APP_URL || 'https://agentready.onrender.com';

export function g(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const withSlash = p.endsWith('/') || /\.[a-z0-9]+$/i.test(p) ? p : `${p}/`;
  return `${GRFA}${withSlash}`;
}
