/**
 * 应用配置 - 动态获取当前访问地址
 *
 * 自动适配：
 * - 本地开发：localhost:3000
 * - 服务器部署：自动获取当前访问的域名/IP
 * - 环境变量：可覆盖自动检测
 */

/**
 * 获取应用的基础 URL
 *
 * 优先级：
 * 1. 环境变量 NEXT_PUBLIC_BASE_URL
 * 2. 请求头中的 Host（服务器端）
 * 3. 开发环境默认 localhost
 */
export function getBaseUrl(): string {
  // 1. 优先使用环境变量
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // 2. 服务器端：从请求上下文获取
  if (typeof window === 'undefined') {
    // 在服务器端运行时无法自动获取请求头
    // 因此强烈建议设置环境变量或在反向代理中处理
    // 这里返回一个默认的相对路径前缀
    return '';
  }

  // 3. 客户端：根据当前浏览器地址动态获取
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
}

/**
 * 获取 API 的完整 URL（用于客户端请求）
 * 如果在服务器端，返回空字符串让浏览器使用相对路径
 */
export function getApiUrl(): string {
  return getBaseUrl();
}

/**
 * 判断是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 判断是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
