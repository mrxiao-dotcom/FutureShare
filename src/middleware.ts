import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 管理后台路由保护
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只保护 /admin 路径（排除 /admin/login）
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // 从 cookie 或 header 获取 token
    const adminToken = request.cookies.get('admin_token')?.value ||
                       request.headers.get('x-admin-token');

    // 如果没有 token，重定向到登录页
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 验证 token
    try {
      const payload = JSON.parse(Buffer.from(adminToken, 'base64').toString());
      if (payload.exp < Date.now()) {
        // Token 过期
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('expired', 'true');
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      // 无效的 token
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * 配置匹配路径
 */
export const config = {
  matcher: ['/admin/:path*'],
};
