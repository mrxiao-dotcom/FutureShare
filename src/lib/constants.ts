/**
 * 应用层类型常量定义
 *
 * 由于 SQLite 不支持 Prisma 原生枚举，这里统一使用 String 类型
 * 在应用层通过这些常量进行类型校验和值比较
 */

// ============================================
// 用户类型
// ============================================
export const UserType = {
  PRIORITY: 'PRIORITY',  // 优先用户
  JUNIOR: 'JUNIOR',     // 劣后用户
  TRADER: 'TRADER',     // 操盘手
} as const;

export type UserType = typeof UserType[keyof typeof UserType];

// ============================================
// 用户状态
// ============================================
export const UserStatus = {
  ACTIVE: 'ACTIVE',       // 活跃
  SUSPENDED: 'SUSPENDED', // 停用
  WITHDRAWN: 'WITHDRAWN', // 已退出
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

// ============================================
// 参与状态
// ============================================
export const ParticipationStatus = {
  ACTIVE: 'ACTIVE',     // 参与中
  SETTLED: 'SETTLED',   // 已结算
  WITHDRAWN: 'WITHDRAWN', // 已退出
} as const;

export type ParticipationStatus = typeof ParticipationStatus[keyof typeof ParticipationStatus];

// ============================================
// 交易类型
// ============================================
export const TransactionType = {
  DEPOSIT: 'DEPOSIT',         // 入金（追加投资）
  WITHDRAWAL: 'WITHDRAWAL',   // 出金（提取资金）
  DIVIDEND: 'DIVIDEND',       // 分红（盈利分配）
  LOSS_SHARE: 'LOSS_SHARE',   // 亏损承担
  MANAGEMENT_FEE: 'MANAGEMENT_FEE', // 管理费
  REINVEST: 'REINVEST',       // 追投
  ADJUSTMENT: 'ADJUSTMENT',   // 手动调整
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

// ============================================
// 交易状态
// ============================================
export const TransactionStatus = {
  PENDING: 'PENDING',       // 待处理/待生效
  PROCESSING: 'PROCESSING',  // 处理中
  COMPLETED: 'COMPLETED',    // 已完成/已生效
  CANCELLED: 'CANCELLED',    // 已取消
  FAILED: 'FAILED',          // 失败
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

// ============================================
// 结算状态
// ============================================
export const SettlementStatus = {
  PENDING: 'PENDING',       // 待结算
  CALCULATING: 'CALCULATING', // 计算中
  COMPLETED: 'COMPLETED',    // 已完成
  CANCELLED: 'CANCELLED',   // 已取消
} as const;

export type SettlementStatus = typeof SettlementStatus[keyof typeof SettlementStatus];

// ============================================
// 类型校验辅助函数
// ============================================

/**
 * 校验用户类型是否有效
 */
export function isValidUserType(value: string): value is UserType {
  return Object.values(UserType).includes(value as UserType);
}

/**
 * 校验用户状态是否有效
 */
export function isValidUserStatus(value: string): value is UserStatus {
  return Object.values(UserStatus).includes(value as UserStatus);
}

/**
 * 校验交易类型是否有效
 */
export function isValidTransactionType(value: string): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * 校验交易状态是否有效
 */
export function isValidTransactionStatus(value: string): value is TransactionStatus {
  return Object.values(TransactionStatus).includes(value as TransactionStatus);
}

/**
 * 校验结算状态是否有效
 */
export function isValidSettlementStatus(value: string): value is SettlementStatus {
  return Object.values(SettlementStatus).includes(value as SettlementStatus);
}

/**
 * 获取用户类型中文标签
 */
export function getUserTypeLabel(type: UserType): string {
  const labels: Record<UserType, string> = {
    [UserType.PRIORITY]: '优先用户',
    [UserType.JUNIOR]: '劣后用户',
    [UserType.TRADER]: '操盘手',
  };
  return labels[type] || type;
}

/**
 * 获取用户状态中文标签
 */
export function getUserStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: '参与中',
    [UserStatus.SUSPENDED]: '已停用',
    [UserStatus.WITHDRAWN]: '已退出',
  };
  return labels[status] || status;
}

/**
 * 获取交易类型中文标签
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    [TransactionType.DEPOSIT]: '入金',
    [TransactionType.WITHDRAWAL]: '出金',
    [TransactionType.DIVIDEND]: '分红',
    [TransactionType.LOSS_SHARE]: '亏损承担',
    [TransactionType.MANAGEMENT_FEE]: '管理费',
    [TransactionType.REINVEST]: '追投',
    [TransactionType.ADJUSTMENT]: '手动调整',
  };
  return labels[type] || type;
}

/**
 * 获取交易状态中文标签
 */
export function getTransactionStatusLabel(status: TransactionStatus): string {
  const labels: Record<TransactionStatus, string> = {
    [TransactionStatus.PENDING]: '待处理',
    [TransactionStatus.PROCESSING]: '处理中',
    [TransactionStatus.COMPLETED]: '已完成',
    [TransactionStatus.CANCELLED]: '已取消',
    [TransactionStatus.FAILED]: '失败',
  };
  return labels[status] || status;
}
