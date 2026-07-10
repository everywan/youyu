# 有余 - 财务自由辅助 App H5 MVP

这是一个移动端优先的财务自由仪表盘 MVP。用户维护资产负债、三档预算、一次性现金流和持续性现金流后，系统会计算自由等级、年资产收益覆盖率、支撑年限、预计达成时间和关键瓶颈提醒。

实现依据见 [docs/spec/mvp-h5-first-version-spec.md](docs/spec/mvp-h5-first-version-spec.md)。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Ant Design Vue
- Vitest
- 浏览器本地持久化：版本化 JSON 数据包

## 本地运行

先安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认会监听：

```text
http://127.0.0.1:5173/
```

如果端口被占用，可以指定端口：

```bash
npm run dev -- --port 5174
```

## 常用命令

运行单元测试：

```bash
npm test
```

开发时监听测试：

```bash
npm run test:watch
```

生产构建：

```bash
npm run build
```

构建产物会输出到 `dist/`，该目录不提交到仓库。

## 页面功能

应用是一个 H5 单页应用，底部有 4 个 Tab：

- 首页：展示自由等级、基础覆盖率、预计达成时间、核心资产指标、三档自由进度、关键提醒和最近更新。三档自由进度会展示“资产收益 / 月”和对应档位“预算门槛 / 月”。
- 录入：维护资产负债、三档预算和现金流。资产负债内部分为资产、负债、耐用消费品三个子页；现金流使用统一列表展示工资、被动收入、支出和一次性收入。新增操作以列表末尾的“+ 新增...”行进入弹窗。
- 推演：调整月现金收入、预留资产和不可动用资产，查看自由时间变化。推演使用所有收益型资产，按资产页每项年化收益率计算整体年化，并扣除设置页 CPI；每月按“现金收入 + 资产收入 - 对应档位预算 - 负债月供”滚动。推演不会覆盖真实数据。
- 设置：维护 CPI、应急金月数等参数，导出 JSON 备份，恢复 JSON 数据，清空本地数据。

首次进入且没有基础数据时，会展示轻量引导流程。每一步都可以跳过。

## 代码结构

```text
src/
  App.vue                         应用壳、底部 Tab、Repository 注入
  main.ts                         Vue 入口
  styles.css                      全局移动端样式
  domain/
    types.ts                      核心业务类型
    calculations.ts               财务计算与推演逻辑
  repositories/
    AppDataRepository.ts          Repository 接口
    LocalAppDataRepository.ts     localStorage 本地实现
    defaultData.ts                默认数据包
  pages/
    HomePage.vue                  首页仪表盘
    EntryPage.vue                 录入页
    ScenarioPage.vue              推演页
    SettingsPage.vue              设置页
    OnboardingPage.vue            首次引导
  utils/
    format.ts                     金额、百分比、日期等格式化工具
tests/
  domain/                         核心财务公式测试
  repositories/                   本地 Repository 测试
  setup.ts                        Vitest 浏览器 API 测试环境
```

## 架构说明

代码按三层组织：

- View：`src/pages/*` 和 `src/App.vue`，负责展示、表单和交互。
- Domain Service：`src/domain/calculations.ts`，负责所有财务公式、自由等级、支撑年限、达成时间和推演比较。
- Repository：`src/repositories/*`，负责数据读取、保存、导入和导出。

页面组件不直接调用 `localStorage`。当前 MVP 使用 `LocalAppDataRepository`，后续接入 Go / MySQL / Redis 时，可以用 HTTP Repository 替换本地实现，尽量不改页面组件。

## 本地数据

数据保存在浏览器 `localStorage` 中，key 为：

```text
youyu.app-data.v1
```

数据包是版本化 JSON：

```ts
type AppDataPackage = {
  schemaVersion: 1
  assets: Asset[]
  liabilities: Liability[]
  budgets: Budget[]
  oneTimeCashflows: OneTimeCashflow[]
  recurringCashflows: RecurringCashflow[]
  scenarios: Scenario[]
  settings: AppSettings
  updatedAt: string
}
```

预算默认使用子项录入：

```ts
type Budget = {
  monthlyFixed: number
  fixedExpenseMode: 'items'
  fixedExpenseItems: FixedExpenseItem[]
  annualLargeExpense: number
  annualReserve: number
}

type FixedExpenseItem = {
  category:
    | 'dining'
    | 'rent_mortgage'
    | 'commute'
    | 'utilities'
    | 'communications'
    | 'healthcare'
    | 'insurance'
    | 'family_support'
    | 'leisure_shopping'
    | 'pocket_money'
    | 'custom'
  name?: string
  amount: number
}
```

预算页默认只展示三档汇总行，基础 / 舒适 / 理想默认月总支出为 `4000 / 8000 / 10000`。点击汇总行后展开明细，明细默认包含一个“汇总项”和餐饮、房租/房贷、通勤、水电燃气、通讯网络、医疗健康、保险、家庭/赡养、娱乐购物、零花钱。所有明细项都可删除，用户也可以追加任意自定义 `key + value`，`monthlyFixed` 会由所有子项自动汇总为月总支出。旧版总固定支出、日常、家庭、耐用预算字段会在加载时迁移为自定义子项，MVP 页面不再单独展示这些字段。

加载旧的 `monthlyCashflows` 数据包时，会自动迁移为单月有效的 `recurringCashflows` 规则，并补齐缺失的现金流拆分字段。

设置页可以导出完整 JSON，也可以粘贴 JSON 恢复。恢复时会校验版本、必要字段和非负金额；失败时不会覆盖当前数据。

## 核心计算

主要计算集中在 `src/domain/calculations.ts`：

- `calculateNetWorth`：收益型资产总额、收益型净资产、可支配资产、不可动用资产、预留资产、年资产收益。
- `calculateBudgetSummary`：年预算支出、年资产收益覆盖率、年资金缺口。
- `calculateSupportYears`：支撑年限和边界状态。
- `calculateFreedomLevel`：基础、标准、高级自由等级判断。
- `projectFreedomTime`：用所有收益型资产按整体实际年化按月迭代预计达成时间。
- `calculateSalaryIncomeEstimate`：按月工资、公积金比例和年度综合所得税表折算估算工资收入。
- `buildMonthlyCashflowFromRecurring`：把持续性现金流规则自动生成指定月份的现金流。
- `applyOneTimeCashflowToAssets`：把一次性现金流金额合并到同名同类型资产。
- `calculateDashboard`：把原始数据汇总为首页快照。
- `buildScenarioComparison`：推演页场景对比和瓶颈判断。

工资收入估算口径：

- 月应税收入 = 月工资 - 个人公积金 - 5000，个税按年度综合所得税表折算到月。
- 公积金比例默认 12%，城市基数上限内置上海、广州、北京、深圳、苏州、南京、杭州、天津、武汉、成都、重庆、西安、长沙，用户可以手动改基数上限。
- 月公积金入账按个人 + 单位两份估算，税后工资会扣除个人公积金和个税。
- 工资规则保存后，会把本月税后工资加入资产里的 `现金余额`，把公积金入账加入 `公积金余额`。
- 工资规则支持年终奖，可录入总额或到手额、发放月份；当前 MVP 总额按到手额处理，不额外估算年终奖税。
- 年终奖会在发放月份每年自动加入一次 `现金余额`，并在该月现金流推演里计入主动收入。

金额展示会自动切换单位：千元以上显示 `k`，万元以上显示 `w`，例如 `¥8.9k`、`¥42.6w`。

## 测试覆盖

当前测试覆盖：

- 收益型净资产计算
- 可支配资产计算
- 年预算支出
- 年资产收益覆盖率
- 支撑年限边界
- 自由等级判断
- 月结余小于等于 0 时不可达
- 80 年内仍未达标时不可达
- 推演变量变化后的时间差
- 工资到手收入和公积金估算
- 持续性现金流自动生成当月现金流
- 一次性现金流合并到资产
- 金额 k/w 单位格式化
- 本地数据保存、导出、导入和恢复失败保护

运行：

```bash
npm test
```

## 开发建议

- 新增或修改财务公式时，先补 `tests/domain/*`。
- 新增持久化规则时，先补 `tests/repositories/*`。
- 页面不要直接读写 `localStorage`，通过 Repository 或上层传入的保存函数更新数据。
- 金额字段默认非负；月份格式使用 `YYYY-MM`。
- 同一个月份只保留一条现金流记录，重复保存视为更新。
- 资产年化收益率在每个资产项里维护；全局 CPI 默认 1%，可以在设置页调整。
