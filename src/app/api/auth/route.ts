import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 简单的 token 生成（生产环境应使用专业库）
 */
function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天过期
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * 验证 token
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/**
 * POST Handler: 用户登录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    if (action === 'login') {
      // 用户登录
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

      return NextResponse.json({
        success: true,
        message: '登录成功',
        token,
        user: {
          id: user.id,
          name: user.name,
          displayName: user.displayName,
          userType: user.userType,
          isAdmin: user.isAdmin,
        },
      });

    } else if (action === 'resetPassword') {
      // 管理员重置密码
      if (!username || !password) {
        return NextResponse.json(
          { success: false, error: '用户名和新密码不能为空' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { name: username.trim() },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }

      // 密码加密
      const hashedPassword = await hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: '密码重置成功',
      });

    } else {
      return NextResponse.json(
        { success: false, error: '无效的操作' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('【认证】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET Handler: 获取当前用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: '登录已过期' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        displayName: true,
        userType: true,
        isAdmin: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error) {
    console.error('【获取用户信息】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
