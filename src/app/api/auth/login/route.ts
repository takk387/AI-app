import { NextResponse } from 'next/server';

const SITE_PASSWORD = process.env.SITE_PASSWORD;

export async function POST(request: Request) {
  try {
    // Verify SITE_PASSWORD is configured
    if (!SITE_PASSWORD) {
      return NextResponse.json(
        { error: 'Server configuration error: SITE_PASSWORD not set. Add SITE_PASSWORD to .env.local' },
        { status: 500 }
      );
    }

    const { password } = await request.json();

    if (password === SITE_PASSWORD) {
      const response = NextResponse.json({ success: true });
      
      // Set secure cookie that expires in 7 days
      response.cookies.set('site-auth', SITE_PASSWORD, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
