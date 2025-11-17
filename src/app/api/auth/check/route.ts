import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SITE_PASSWORD = process.env.SITE_PASSWORD;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('site-auth');

    if (authCookie?.value === SITE_PASSWORD) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
