# 财务自由辅助 App MVP 第一版实现 Spec

> 来源：`docs/产品定义.md` 的 MVP 章节。
> 状态：第一版实现 spec。
> 技术取向：H5 第一公民，前端优先实现，接口隔离以便后续替换 Go / MySQL / Redis。

## 1. 目标

第一版只验证一个核心闭环：

> 用户每月维护一次财务状态，系统能算出自由等级、被动收入覆盖率、支撑年限、预计达成时间，并说明主要瓶颈。

第一版不做完整记账软件，也不做投资建议。它要先成为一个可在手机上舒服使用的个人财务自由仪表盘。

## 2. 技术范围

### 2.1 MVP 技术栈

1. 前端：Vue 3、TypeScript、Ant Design Vue。
2. 数据：浏览器本地持久化，优先采用版本化 JSON 数据包。
3. 架构：页面通过 Repository 和 Domain Service 访问数据与计算逻辑。
4. 部署形态：H5 单页应用，优先适配移动端浏览器。

### 2.2 后续技术预留

1. 后端：Go。
2. 数据库：MySQL。
3. 缓存或会话：Redis。
4. 替换方式：把本地 Repository 实现替换为 HTTP Repository，页面组件不直接改动。

Redis 不进入 MVP 第一版实现，只在后续登录、同步、缓存或服务端会话场景中使用。

## 3. 产品范围

### 3.1 必做

1. 首次目标设置：目标模板、三档预算、目标资产、目标月被动收入。
2. 首页仪表盘：自由等级、覆盖率、资产、缺口、支撑年限、预计达成时间、关键提醒。
3. 资产负债：收益型资产、负债、不可动用资产、预留资产、年被动现金流。
4. 预算：基础、舒适、理想三档预算，支持月预算和年度大额支出。
5. 月度现金流：月收入、月支出、月结余和备注。
6. 推演：调整收入、支出、收益率、预留资产、不可动用资产，查看自由时间变化。
7. 本地保存：本地持久化、JSON 备份、JSON 恢复。

### 3.2 简化处理

1. 耐用消费成本只支持在现金流中录入“耐用消费本月摊销”。
2. 退休预估保留为独立后续 spec，不进入 MVP 第一版。
3. 自定义目标只作为辅助完成度展示，不覆盖预算覆盖模型。

### 3.3 不做

1. 逐笔记账、商户识别、复杂消费分类。
2. 微信、支付宝、银行卡自动同步。
3. 账单导入、账单导出。
4. 投资推荐、交易、调仓或收益承诺。
5. 股票、基金、黄金每日净值自动更新。
6. 多用户协作、云同步、登录系统。

## 4. 移动端信息架构

MVP 使用 4 个底部 Tab。

### 4.1 首页

首页是结论页，不是表单页。用户打开后应立即看到自己离财务自由还有多远。

首页模块顺序：

1. 顶部状态区：当前自由等级、被动收入覆盖率、预计达成时间。
2. 核心指标区：收益型净资产、可支配资产、年资金缺口、支撑年限。
3. 三档进度区：基础自由、标准自由、高级自由的覆盖率和预计时间。
4. 关键提醒区：展示 2 到 4 条主要瓶颈提醒。
5. 最近更新区：展示最近一个月现金流和数据更新时间。

首页展示原则：

1. 数字优先，解释次之。
2. 单列布局，避免横向滚动。
3. 指标卡片不嵌套。
4. 关键提醒使用短句，不写长篇建议。

### 4.2 录入

录入页承载每月维护动作，用顶部或页内分段切换组织三个子页：

1. 资产负债。
2. 预算。
3. 现金流。

资产负债子页：

1. 内部分为资产、负债、耐用消费品三个子 tab。
2. 每个子 tab 都以已添加列表为主体。
3. 列表行展示明显 tag，例如收益性资产、非收益资产、房贷、耐用消费品。
4. 新增操作以列表末尾的“+ 新增...”行进入弹窗。
5. 点击已有行进入编辑弹窗。

预算子页：

1. 基础预算、舒适预算、理想预算三档切换。
2. 每档默认展示房租/房贷、餐饮、水电、交通、零花钱五个子项。
3. 用户可以追加任意自定义 `key + value` 子项。
4. 每档展示月预算合计、年度大额支出、年度预留支出。
5. 自动展示年预算支出。

现金流子页：

1. 不再拆成持续性和一次性两个子 tab，统一用一个现金流列表展示。
2. 列表行展示明显 tag，例如工资、被动收入、支出、一次性收入。
3. 新增操作以列表末尾的“+ 新增现金流”行进入弹窗。
4. 弹窗内选择现金流类型后展示对应字段。
5. 系统自动计算总收入、总支出、月结余。

### 4.3 推演

推演页用于回答“调什么变量能更快自由”。

页面模块：

1. 顶部结果区：基础、标准、高级自由预计时间。
2. 对比区：相对当前状态提前或推迟多久。
3. 参数区：月主动收入、月总支出、月结余、预期年化收益率、预留资产、不可动用资产。
4. 瓶颈区：展示当前最大影响因素。

推演数据不直接覆盖真实数据。用户可以从推演页选择“保存为场景”，但 MVP 不要求把场景设为正式数据。

### 4.4 设置

设置页只保留必要项：

1. 默认货币：CNY。
2. 默认预期年化收益率。
3. 安全提款率。
4. 应急金月数。
5. 数据备份。
6. 数据恢复。
7. 清空本地数据。

清空本地数据需要二次确认。

## 5. 首次引导

首次进入时展示轻量引导流程：

1. 选择目标模板：小县城基础自由、城市基础自由、标准自由、高级自由、自定义。
2. 录入三档预算。
3. 录入当前资产和负债。
4. 录入当前月度现金流。
5. 进入首页。

每一步允许跳过。跳过后首页显示空状态和补录入口。

引导不是强登录、强注册或复杂问卷。目标是尽快让用户看到第一个仪表盘结果。

## 6. UI 原则

1. H5 是第一公民，所有页面先按 375px 到 430px 宽度设计。
2. 桌面端只做居中窄栏适配，不为桌面重新设计复杂布局。
3. 使用 Ant Design Vue 的表单、输入框、分段控制、抽屉、弹窗、底部按钮。
4. 保存按钮固定在表单底部，避免长表单滚动后找不到操作。
5. 金额输入默认使用数字键盘，展示时统一使用人民币格式。
6. 百分比输入展示为年化口径，例如 `4%`。
7. 空状态必须给出下一步操作，例如“去录入预算”。
8. 错误状态使用明确文案，例如“预算必须大于 0，才能计算覆盖率”。

## 7. 架构设计

MVP 分为三层：View、Domain Service、Repository。

### 7.1 View 层

View 层负责展示、交互和表单校验。

建议页面：

1. `HomePage`
2. `EntryPage`
3. `ScenarioPage`
4. `SettingsPage`
5. `OnboardingPage`

组件不直接读写浏览器存储，不直接实现财务公式。

### 7.2 Domain Service 层

Domain Service 层负责财务计算和状态判断。

建议服务：

1. `calculateDashboard`
2. `calculateFreedomLevel`
3. `calculateBudgetSummary`
4. `calculateNetWorth`
5. `projectFreedomTime`
6. `buildScenarioComparison`
7. `buildInsightMessages`

这些函数只接受结构化数据，返回结构化结果，不依赖 Vue、不依赖浏览器存储。

### 7.3 Repository 层

Repository 层负责数据读取和保存。MVP 使用本地实现，后续可替换为 HTTP 实现。

建议接口：

```ts
interface AppDataRepository {
  loadAppData(): Promise<AppDataPackage>
  saveAppData(data: AppDataPackage): Promise<void>
  exportAppData(): Promise<string>
  importAppData(json: string): Promise<AppDataPackage>
}

interface DashboardRepository {
  getDashboardSnapshot(): Promise<DashboardSnapshot>
}

interface TargetRepository {
  listTargets(): Promise<FreedomTarget[]>
  saveTarget(target: FreedomTarget): Promise<void>
  removeTarget(id: string): Promise<void>
}

interface AssetRepository {
  listAssets(): Promise<Asset[]>
  saveAsset(asset: Asset): Promise<void>
  removeAsset(id: string): Promise<void>
  listLiabilities(): Promise<Liability[]>
  saveLiability(liability: Liability): Promise<void>
  removeLiability(id: string): Promise<void>
}

interface BudgetRepository {
  listBudgets(): Promise<Budget[]>
  saveBudget(budget: Budget): Promise<void>
}

interface CashflowRepository {
  listMonthlyCashflows(): Promise<MonthlyCashflow[]>
  saveMonthlyCashflow(cashflow: MonthlyCashflow): Promise<void>
}

interface SettingsRepository {
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
}
```

第一版可以由一个 `LocalAppDataRepository` 实现所有接口，但页面只能依赖接口，不依赖具体实现。

## 8. 数据模型

### 8.1 本地数据包

```ts
type AppDataPackage = {
  schemaVersion: 1
  targets: FreedomTarget[]
  assets: Asset[]
  liabilities: Liability[]
  budgets: Budget[]
  monthlyCashflows: MonthlyCashflow[]
  scenarios: Scenario[]
  settings: AppSettings
  updatedAt: string
}
```

### 8.2 FreedomTarget

```ts
type FreedomTarget = {
  id: string
  name: string
  level: 'basic' | 'comfortable' | 'ideal' | 'custom'
  linkedBudgetLevel?: 'basic' | 'comfortable' | 'ideal'
  targetAssetAmount?: number
  targetMonthlyPassiveIncome?: number
  requiresHouse?: boolean
  requiresCar?: boolean
  regionLabel?: string
  priority: 'budget_coverage_first' | 'asset_or_passive_income'
}
```

### 8.3 Asset

```ts
type Asset = {
  id: string
  name: string
  type: 'cash' | 'deposit' | 'fund' | 'stock' | 'bond' | 'gold' | 'real_estate' | 'other'
  assetCategory: 'income_generating' | 'non_income' | 'durable'
  amount: number
  isDisposable: boolean
  isLocked: boolean
  reservedAmount?: number
  reservePurpose?: string
  annualYieldRate?: number
  annualCashflow?: number
  updatedAt: string
}
```

字段规则：

1. `assetCategory = income_generating` 的资产进入收益型净资产。
2. `assetCategory = non_income` 和 `assetCategory = durable` 的资产只做展示记录，不进入收益型净资产和被动收入计算。
3. `isLocked = true` 的收益性资产计入不可动用资产。
4. `reservedAmount` 计入预留资产。
5. `reservedAmount` 不能大于 `amount`。
6. `annualCashflow` 只在收益性资产中计入年被动现金流。

### 8.4 Liability

```ts
type Liability = {
  id: string
  name: string
  type: 'mortgage' | 'car_loan' | 'consumer_loan' | 'credit_card' | 'personal_debt' | 'other'
  balance: number
  monthlyPayment?: number
  annualInterestRate?: number
  dueDate?: string
  updatedAt: string
}
```

### 8.5 Budget

```ts
type Budget = {
  id: string
  name: string
  level: 'basic' | 'comfortable' | 'ideal'
  monthlyFixed: number
  fixedExpenseMode: 'items'
  fixedExpenseItems: FixedExpenseItem[]
  annualLargeExpense: number
  annualReserve: number
}

type FixedExpenseItem = {
  id: string
  category: 'rent_mortgage' | 'dining' | 'utilities' | 'transport' | 'pocket_money' | 'custom'
  name?: string
  amount: number
}
```

预算默认使用子项录入。默认子项为房租/房贷、餐饮、水电、交通、零花钱；用户可以追加任意自定义 `key + value` 子项。`monthlyFixed` 由所有预算子项自动汇总，不再单独录入总固定支出、日常、家庭、耐用预算字段。

旧版数据中的总固定支出、日常、家庭、耐用预算字段在本地加载时迁移为自定义子项。

### 8.6 MonthlyCashflow

```ts
type MonthlyCashflow = {
  id: string
  month: string
  activeIncome: number
  passiveIncome: number
  fixedExpense: number
  dailyExpense: number
  familyExpense: number
  annualExpenseAllocated: number
  durableCostAllocated: number
  note?: string
}
```

### 8.7 Scenario

```ts
type Scenario = {
  id: string
  name: string
  monthlyActiveIncome: number
  monthlyExpense: number
  expectedAnnualReturn: number
  lockedAssetAmount: number
  reservedAssetAmount: number
  budgetLevel: 'basic' | 'comfortable' | 'ideal'
}
```

### 8.8 AppSettings

```ts
type AppSettings = {
  currency: 'CNY'
  defaultAnnualReturn: number
  safeWithdrawalRate: number
  emergencyFundMonths: number
}
```

默认值：

1. `currency = CNY`
2. `defaultAnnualReturn = 0.04`
3. `safeWithdrawalRate = 0.04`
4. `emergencyFundMonths = 6`

## 9. DashboardSnapshot

首页不直接拼接原始数据，而是消费快照。

```ts
type DashboardSnapshot = {
  freedomLevel: 'none' | 'basic' | 'comfortable' | 'ideal'
  incomeGeneratingNetWorth: number
  disposableAssets: number
  lockedAssetAmount: number
  reservedAssetAmount: number
  annualPassiveCashflow: number
  latestMonthlySurplus: number
  budgetSummaries: BudgetSummary[]
  supportYearsByBudget: Record<'basic' | 'comfortable' | 'ideal', SupportYearsResult>
  freedomTimeByBudget: Record<'basic' | 'comfortable' | 'ideal', FreedomTimeResult>
  customTargetProgress: CustomTargetProgress[]
  insightMessages: InsightMessage[]
  updatedAt: string
}
```

```ts
type BudgetSummary = {
  level: 'basic' | 'comfortable' | 'ideal'
  annualBudgetExpense: number
  passiveCoverageRate: number
  annualFundingGap: number
}

type SupportYearsResult = {
  status: 'covered' | 'calculable' | 'insufficient_assets'
  years?: number
}

type FreedomTimeResult = {
  status: 'achieved' | 'projected' | 'not_reachable' | 'missing_data'
  months?: number
  targetDateLabel?: string
  reason?: string
}

type CustomTargetProgress = {
  targetId: string
  name: string
  assetProgressRate?: number
  passiveIncomeProgressRate?: number
  isCompleted: boolean
}

type InsightMessage = {
  type: 'success' | 'warning' | 'risk' | 'info'
  title: string
  description: string
}
```

## 10. 核心计算

### 10.1 收益型净资产

```text
收益型净资产 = 收益型资产总额 - 负债总额
```

收益型净资产不是“当前可立即投资余额”，而是财务自由模型里用于支撑长期推演的净资产口径。

### 10.2 可支配资产

```text
可支配资产 = 收益型净资产 - 不可动用资产 - 预留资产
```

可支配资产用于判断扣掉负债、不可动用资产和明确预留后，真正能支撑自由生活的钱。

### 10.3 月结余

```text
月收入 = 主动收入 + 被动收入
月支出 = 固定支出 + 日常支出 + 家庭支出 + 年度支出本月折算 + 耐用消费本月摊销
月结余 = 月收入 - 月支出
```

首页使用最近一个月现金流的月结余。没有现金流记录时，预计自由时间显示为缺少数据。

### 10.4 年预算支出

```text
年预算支出 = 月预算 * 12 + 年度大额支出 + 年度预留支出
月预算 = fixedExpenseItems 合计
monthlyFixed = fixedExpenseItems 合计
```

### 10.5 被动收入覆盖率

```text
被动收入覆盖率 = 年被动现金流 / 年预算支出
```

年预算支出为 0 时不计算覆盖率，页面提示需要先录入预算。

### 10.6 支撑年限

```text
年资金缺口 = max(年预算支出 - 年被动现金流, 0)
支撑年限 = 可支配资产 / 年资金缺口
```

边界：

1. 年资金缺口为 0 时，支撑年限显示“已覆盖”。
2. 可支配资产小于或等于 0 且存在资金缺口时，显示“可支配资产不足”。
3. 支撑年限最多展示到 99 年，超过显示为“99 年以上”。

### 10.7 自由等级

判断顺序：

1. 年被动现金流 >= 理想年预算支出：高级自由。
2. 年被动现金流 >= 舒适年预算支出：标准自由。
3. 年被动现金流 >= 基础年预算支出：基础自由。
4. 其余情况：未自由。

如果某档预算未录入，则跳过该档判断，并在首页提醒补齐预算。

### 10.8 预计自由时间

按月迭代：

```text
下月收益型净资产 = 当前收益型净资产 * (1 + 月收益率) + 月结余
下月可支配资产 = 下月收益型净资产 - 不可动用资产 - 预留资产
```

每个月重新估算：

```text
年被动现金流 = 下月收益型净资产 * 安全提款率
```

当年被动现金流覆盖对应预算时，视为达到该档自由。

边界：

1. 当前已经达标，状态为 `achieved`。
2. 月结余 <= 0 且当前未达标，状态为 `not_reachable`，原因是当前现金流无法自然达成。
3. 预算缺失，状态为 `missing_data`。
4. 最多迭代 80 年。80 年仍未达标，状态为 `not_reachable`。
5. 预计自由时间只用于规划，不作为收益承诺。

## 11. 推演逻辑

推演页从当前 `DashboardSnapshot` 和原始数据生成默认场景。

用户可调整：

1. 每月主动收入。
2. 每月总支出。
3. 每月结余。
4. 预期年化收益率。
5. 基础、舒适、理想预算。
6. 预留资产。
7. 不可动用资产。

系统展示：

1. 基础自由时间。
2. 标准自由时间。
3. 高级自由时间。
4. 与当前状态相比提前或推迟多久。
5. 当前主要瓶颈。

主要瓶颈判断优先级：

1. 月结余 <= 0：结余不足。
2. 年资金缺口大于基础年预算的 50%：被动收入不足。
3. 预留资产 + 不可动用资产超过收益型净资产的 40%：可支配资产不足。
4. 理想预算超过基础预算的 2 倍：预算目标跨度过大。
5. 预计年化收益率低于 2%：收益率偏低。
6. 其他情况：持续积累中。

## 12. 本地保存、备份与恢复

### 12.1 本地保存

MVP 使用一个版本化 JSON 数据包保存全部数据。每次保存后更新 `updatedAt`。

本地数据损坏或解析失败时：

1. 不覆盖原始数据。
2. 提示用户导出损坏数据用于手动备份。
3. 提供重新初始化入口。

### 12.2 备份

备份导出为 JSON 文件或 JSON 文本。导出内容为完整 `AppDataPackage`。

### 12.3 恢复

恢复时校验：

1. JSON 可解析。
2. `schemaVersion` 受支持。
3. 必要数组字段存在。
4. 金额字段为非负数字。

恢复成功后重新计算首页快照。

## 13. 表单校验与边界

1. 金额字段默认为 0，不能为负数。
2. 收益率允许为 0，不能低于 0。
3. 预算至少需要录入基础预算，才能计算核心首页。
4. 负债余额不能为负数。
5. `reservedAmount` 不能大于资产金额。
6. 月份格式使用 `YYYY-MM`。
7. 同一个月份只保留一条现金流记录，重复保存视为更新。
8. 删除资产、负债、预算、现金流前需要确认。
9. 清空本地数据需要二次确认。

## 14. 错误与空状态

### 14.1 首页空状态

如果没有完成基础数据录入，首页显示：

1. 当前状态：待录入。
2. 缺少的数据：目标、预算、资产负债、现金流。
3. 主操作：去录入。

### 14.2 预算缺失

预算缺失时不计算覆盖率，提示“先录入预算，才能判断自由等级”。

### 14.3 现金流缺失

现金流缺失时不计算预计达成时间，提示“先录入最近一个月现金流，才能推演达成时间”。

### 14.4 本地恢复失败

恢复失败时保留当前数据，并提示失败原因。失败原因包括 JSON 格式错误、版本不支持、字段缺失、金额格式错误。

## 15. 测试与验收

### 15.1 单元测试

Domain Service 至少覆盖：

1. 收益型净资产计算。
2. 可支配资产计算。
3. 年预算支出计算。
4. 被动收入覆盖率计算。
5. 支撑年限边界。
6. 自由等级判断。
7. 月结余 <= 0 时预计自由时间不可达。
8. 80 年仍未达标时预计自由时间不可达。
9. 推演变量变化后的时间差。

### 15.2 页面验收

1. 手机宽度下底部 Tab 可用，无横向滚动。
2. 首页首屏能看到自由等级、覆盖率、预计达成时间。
3. 录入页能完成资产、负债、预算、现金流的新增、编辑、删除。
4. 推演页调整参数后结果实时变化。
5. 设置页能导出和恢复 JSON 数据。

### 15.3 业务验收场景

#### 场景一：小县城基础自由

输入：

1. 目标资产 `2000000`。
2. 基础预算 `5000 / 月`。
3. 当前收益型净资产、月结余、年被动现金流。

期望：

1. 展示被动收入覆盖率。
2. 展示距离目标资产还差多少。
3. 展示按当前月结余和收益率预计需要多久。
4. 展示是否满足月被动收入 `5000`。

#### 场景二：城市打工人

输入：

1. 有房贷或房租。
2. 有每月主动收入和支出。
3. 有预留资产和应急金目标。

期望：

1. 展示收益型净资产。
2. 展示可支配资产。
3. 展示年资金缺口。
4. 展示应急金是否不足。
5. 展示当前状态下的基础自由时间。

#### 场景三：推演

输入：

1. 每月多存 `3000`。
2. 年化收益率从 `4%` 调整为 `5%`。
3. 预留资产增加 `300000`。

期望：

1. 展示基础自由时间提前或推迟多久。
2. 展示标准自由时间提前或推迟多久。
3. 展示主要瓶颈是结余、收益率、预算还是预留资产。

#### 场景四：简化耐用消费成本

输入：

1. 本月耐用消费摊销 `400`。

期望：

1. 该成本进入月度生活成本和预算。
2. 该成本不进入资产。

### 15.4 技术验收

1. 页面组件不直接调用 `localStorage`。
2. 核心财务公式集中在 Domain Service。
3. Repository 接口可由本地实现替换为 HTTP 实现。
4. 备份后恢复，首页快照与恢复前一致。
5. 本地数据包包含 `schemaVersion`。

## 16. 后续扩展

1. Go API：按 Repository 接口拆分服务端接口。
2. MySQL：把目标、资产、负债、预算、现金流、设置拆表存储。
3. Redis：用于登录会话、缓存 DashboardSnapshot 或异步任务状态。
4. 退休预估：按 `docs/prd/退休预估功能spec.md` 接入推演和首页摘要。
5. 耐用消费成本台账：按 `docs/prd/耐用消费成本功能spec.md` 扩展。
6. 数据导入导出：后续可支持 CSV 或 Excel，但不改变预算驱动主线。
