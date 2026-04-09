/**
 * 认证工具函数
 * 包含 token 生成和验证逻辑
 */

/**
 * 简单的 token 生成（生产环境应使用专业库如 jsonwebtoken）
 */
export function generateToken(userId: string): string {
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