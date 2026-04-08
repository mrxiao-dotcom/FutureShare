import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 简单的 token 生成
 */
function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天过期
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * POST Handler: 管理员登录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { name: username.trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    // 检查是否是管理员
    if (!user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '您不是管理员，无法访问管理后台' },
        { status: 403 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { success: false, error: '该账户未设置密码，请联系管理员初始化密码' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }

    // 检查账户状态
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: '账户已被停用' },
        { status: 403 }
      );
    }

    // 生成 token
    const token = generateToken(user.id);

    // 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
    });

    // 设置 httpOnly cookie（7天有效期）
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('【管理员登录】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE Handler: 管理员登出
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: '已退出登录',
  });

  // 删除 cookie
  response.cookies.delete('admin_token');

  return response;
}
