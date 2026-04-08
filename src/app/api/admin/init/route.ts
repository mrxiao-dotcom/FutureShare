import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * POST Handler: 初始化管理员账号
 *
 * 用于创建或重置管理员账号
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

    // 检查是否已有管理员
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (existingAdmin && !force) {
      return NextResponse.json({
        success: true,
        message: '管理员已存在',
        data: {
          name: existingAdmin.name,
          displayName: existingAdmin.displayName,
        },
      });
    }

    // 密码加密
    const hashedPassword = await hash('admin123', 12);

    let admin;
    if (existingAdmin && force) {
      // 更新现有管理员密码
      admin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          status: 'ACTIVE',
        },
      });
      return NextResponse.json({
        success: true,
        message: '管理员密码已重置',
        data: {
          name: admin.name,
          displayName: admin.displayName,
        },
      });
    }

    // 创建新管理员
    admin = await prisma.user.create({
      data: {
        name: 'admin',
        displayName: '系统管理员',
        email: 'admin@example.com',
        password: hashedPassword,
        userType: 'TRADER',
        isAdmin: true,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: '管理员创建成功',
      data: {
        name: admin.name,
        displayName: admin.displayName,
        username: admin.name,
        password: 'admin123',
      },
    });

  } catch (error) {
    console.error('【初始化管理员】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET Handler: 检查管理员状态
 */
export async function GET() {
  try {
    const admin = await prisma.user.findFirst({
      where: { isAdmin: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        status: true,
        password: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        exists: !!admin,
        name: admin?.name,
        displayName: admin?.displayName,
        hasPassword: !!admin?.password,
        status: admin?.status,
      },
    });

  } catch (error) {
    console.error('【检查管理员】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
