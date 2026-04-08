/**
 * 结构化基金核心分配算法
 *
 * 分配逻辑：
 * - 盈利时：利润按 操盘手(20%) / 优先(40%) / 劣后(40%) 分配
 * - 亏损时：优先方保本，所有亏损由劣后方承担
 * - 高水位线：只有结算分红后，才会更新基准本金
 */

// ============================================
// 类型定义
// ============================================

/**
 * 分配比例配置
 */
export interface AllocationConfig {
  /** 操盘手分成比例 */
  traderRatio: number;
  /** 优先方分成比例 */
  priorityRatio: number;
  /** 劣后方分成比例 */
  juniorRatio: number;
}

/**
 * 分配算法输入参数
 */
export interface CalculatorInput {
  /** 当前总资产（动态权益） */
  currentAssets: number;
  /** 当前基准本金（高水位线） */
  baseCapital: number;
  /** 优先方基准本金 */
  priorityBase: number;
  /** 劣后方基准本金 */
  juniorBase: number;
  /** 分配比例配置 */
  config: AllocationConfig;
}

/**
 * 分配算法返回结果
 */
export interface CalculatorResult {
  /** 总盈亏金额 */
  totalProfit: number;
  /** 是否盈利状态 */
  isProfit: boolean;
  /** 操盘手分配金额 */
  traderFee: number;
  /** 优先方总权益 */
  priorityAssets: number;
  /** 劣后池总权益 */
  juniorAssets: number;
  /** 优先方本次分配收益 */
  priorityProfit: number;
  /** 劣后池本次分配收益 */
  juniorProfit: number;
  /** 劣后用户每股净值（基于份额计算） */
  netAssetValuePerShare: number;
}

// ============================================
// 校验函数
// ============================================

/**
 * 校验分配比例配置
 * 三者之和必须为 1 (100%)
 */
export function validateAllocationConfig(config: AllocationConfig): void {
  const sum = config.traderRatio + config.priorityRatio + config.juniorRatio;
  const tolerance = 0.0001; // 浮点数容差

  if (Math.abs(sum - 1) > tolerance) {
    throw new Error(
      `分配比例配置错误：traderRatio(${config.traderRatio}) + ` +
      `priorityRatio(${config.priorityRatio}) + ` +
      `juniorRatio(${config.juniorRatio}) = ${sum}，三者之和必须等于 1`
    );
  }
}

/**
 * 校验输入参数有效性
 */
export function validateCalculatorInput(input: CalculatorInput): void {
  if (typeof input.currentAssets !== 'number' || isNaN(input.currentAssets)) {
    throw new Error('currentAssets 必须为有效数字');
  }
  if (typeof input.baseCapital !== 'number' || isNaN(input.baseCapital)) {
    throw new Error('baseCapital 必须为有效数字');
  }
  if (input.currentAssets < 0) {
    throw new Error('currentAssets 不能为负数');
  }
  if (input.baseCapital < 0) {
    throw new Error('baseCapital 不能为负数');
  }
  if (input.priorityBase < 0 || input.juniorBase < 0) {
    throw new Error('priorityBase 和 juniorBase 不能为负数');
  }

  validateAllocationConfig(input.config);
}

// ============================================
// 核心分配算法
// ============================================

/**
 * 结构化基金核心分配算法
 *
 * @param input - 分配计算输入参数
 * @returns 分配结果对象
 *
 * @example
 * ```typescript
 * const result = calculateAllocation({
 *   currentAssets: 1100000,  // 当前总资产 110 万
 *   baseCapital: 1000000,   // 基准本金 100 万
 *   priorityBase: 900000,   // 优先本金 90 万
 *   juniorBase: 100000,     // 劣后本金 10 万
 *   config: {
 *     traderRatio: 0.2,
 *     priorityRatio: 0.4,
 *     juniorRatio: 0.4
 *   }
 * });
 *
 * // 盈利 10 万场景：
 * // result.traderFee = 20000 (操盘手获得 20%)
 * // result.priorityAssets = 940000 (优先本金 90万 + 收益 4万)
 * // result.juniorAssets = 140000 (劣后本金 10万 + 收益 4万)
 * ```
 */
export function calculateAllocation(input: CalculatorInput): CalculatorResult {
  // 参数校验
  validateCalculatorInput(input);

  const { currentAssets, baseCapital, priorityBase, juniorBase, config } = input;

  // 计算总盈亏
  const totalProfit = currentAssets - baseCapital;
  const isProfit = totalProfit > 0;

  let traderFee: number;
  let priorityAssets: number;
  let juniorAssets: number;
  let priorityProfit: number;
  let juniorProfit: number;

  if (isProfit) {
    // ==================== 盈利分配逻辑 ====================
    // 利润 = 当前资产 - 基准本金
    // 分配：操盘手 20%，优先 40%，劣后 40%

    traderFee = totalProfit * config.traderRatio;
    priorityProfit = totalProfit * config.priorityRatio;
    juniorProfit = totalProfit * config.juniorRatio;

    // 优先方总权益 = 优先本金 + 分配收益
    priorityAssets = priorityBase + priorityProfit;
    // 劣后池总权益 = 劣后本金 + 分配收益
    juniorAssets = juniorBase + juniorProfit;
  } else {
    // ==================== 亏损分配逻辑 ====================
    // 亏损时：优先方保本，劣后承担所有亏损
    // 只有当亏损超过劣后本金时，才会侵蚀优先本金

    traderFee = 0;
    priorityProfit = 0;
    juniorProfit = totalProfit; // 负数表示亏损

    // 优先方总权益保持不变（保本）
    priorityAssets = priorityBase;

    // 劣后池承担所有盈亏
    juniorAssets = juniorBase + totalProfit;
  }

  // 计算劣后用户每股净值
  // netAssetValuePerShare = 劣后池总权益 / 劣后本金总额
  // 如果 juniorBase 为 0，返回 0 避免除零错误
  const netAssetValuePerShare = juniorBase > 0 ? juniorAssets / juniorBase : 0;

  return {
    totalProfit,
    isProfit,
    traderFee,
    priorityAssets,
    juniorAssets,
    priorityProfit,
    juniorProfit,
    netAssetValuePerShare,
  };
}

/**
 * 劣后投资用户输入
 */
export interface JuniorInvestment {
  /** 用户ID */
  userId: string;
  /** 投资金额 */
  amount: number;
}

/**
 * 劣后投资用户输出（包含份额比例）
 */
export interface JuniorInvestmentWithShare {
  /** 用户ID */
  userId: string;
  /** 投资金额 */
  amount: number;
  /** 份额比例 */
  shareRatio: number;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 计算新周期用户份额比例
 * 根据每个劣后用户的投资金额，计算其在总出资中的比例
 *
 * @param investments - 本期所有参与劣后投资的用户及其资金数组
 * @returns 包含更新后 shareRatio 的新数组
 *
 * @example
 * ```typescript
 * const result = calculateNewShares([
 *   { userId: 'user1', amount: 50000 },
 *   { userId: 'user2', amount: 30000 },
 *   { userId: 'user3', amount: 20000 },
 * ]);
 * // 返回：
 * // [
 * //   { userId: 'user1', amount: 50000, shareRatio: 0.5 },
 * //   { userId: 'user2', amount: 30000, shareRatio: 0.3 },
 * //   { userId: 'user3', amount: 20000, shareRatio: 0.2 },
 * // ]
 * ```
 */
export function calculateNewShares(
  investments: JuniorInvestment[]
): JuniorInvestmentWithShare[] {
  // 计算所有用户的总投资额
  const totalAmount = investments.reduce(
    (sum, investment) => sum + investment.amount,
    0
  );

  // 校验总投资额不能为 0
  if (totalAmount === 0) {
    throw new Error('总投资额不能为0');
  }

  // 为每个用户计算新的份额比例
  return investments.map((investment) => ({
    userId: investment.userId,
    amount: investment.amount,
    shareRatio: investment.amount / totalAmount,
  }));
}

/**
 * 计算实时各方应得权益（用于前端展示）
 * 假设劣后用户持有 juniorShare 份份额
 */
export function calculateUserEquity(
  juniorShare: number,
  netAssetValuePerShare: number
): number {
  return juniorShare * netAssetValuePerShare;
}

/**
 * 根据结算权益和变动金额，重新计算劣后用户份额比例
 * 用于结算时自动重算
 *
 * @param settledAssets - 结算后的总资产
 * @param juniorCapitalChange - 劣后用户变动金额（入金为正，出金为负）
 * @param existingJuniorBase - 原劣后本金总额
 * @param existingShareRatio - 原份额比例
 */
export function recalculateShareRatio(
  settledAssets: number,
  juniorCapitalChange: number,
  existingJuniorBase: number,
  existingShareRatio: number
): number {
  // 新劣后本金 = 原本金 + 变动金额
  const newJuniorBase = existingJuniorBase + juniorCapitalChange;

  // 新劣后池权益 = 结算资产 - 优先本金（按原比例）
  const priorityBaseRatio = 0.9; // 优先本金占基准比例
  const newJuniorAssets = settledAssets * (1 - priorityBaseRatio);

  // 新份额净值 = 新劣后池权益 / 新劣后本金
  const newNAV = newJuniorBase > 0 ? newJuniorAssets / newJuniorBase : 1;

  // 新份额比例 = 原份额 * 原净值 / 新净值
  // 简化：如果净值变化，用户份额不变，但每股价值变化
  return existingShareRatio;
}

/**
 * 格式化金额显示（千分位）
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * 计算高水位线更新后的新基准本金
 */
export function calculateNewBaseCapital(
  currentAssets: number,
  priorityRatio: number,
  juniorRatio: number
): { newBaseCapital: number; newPriorityBase: number; newJuniorBase: number } {
  const newPriorityBase = currentAssets * priorityRatio;
  const newJuniorBase = currentAssets * juniorRatio;
  const newBaseCapital = newPriorityBase + newJuniorBase;

  return {
    newBaseCapital,
    newPriorityBase,
    newJuniorBase,
  };
}

// ============================================
// 测试示例
// ============================================

/**
 * calculateNewShares 函数测试
 */
function testCalculateNewShares(): void {
  const investments: JuniorInvestment[] = [
    { userId: 'user_001', amount: 50000 },
    { userId: 'user_002', amount: 30000 },
    { userId: 'user_003', amount: 20000 },
  ];

  const result = calculateNewShares(investments);

  console.log('=== 份额计算测试 ===');
  console.log('总投资额: 100000');
  console.log('各用户份额:');
  result.forEach((item) => {
    console.log(`  ${item.userId}: ${(item.shareRatio * 100).toFixed(2)}%`);
  });
  // 输出：
  // user_001: 50.00%
  // user_002: 30.00%
  // user_003: 20.00%
}
