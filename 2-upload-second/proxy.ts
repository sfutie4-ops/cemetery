import { NextResponse, type NextRequest } from 'next/server';

// Whole-site password lock (HTTP Basic Auth).
// Set SITE_PASSWORD (and optionally SITE_USERNAME) in Vercel → Project → Settings → Environment Variables.
// If SITE_PASSWORD is not set, the site stays open.
export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();
  const username = process.env.SITE_USERNAME || 'admin';

  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(':');
      if (i >= 0 && decoded.slice(0, i) === username && decoded.slice(i + 1) === password) {
        return NextResponse.next();
      }
    } catch {}
  }

  return new NextResponse('Login required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Hinigaran Cemetery", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg).*)'],
};
