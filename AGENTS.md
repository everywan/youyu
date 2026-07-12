# 仓库指南

## 项目结构与模块组织

本仓库包含一个移动端优先的财务自由 H5 应用，使用 Vue 3、TypeScript、Vite 和 Ant Design Vue 构建。

- `src/pages/` 存放页面级 Vue 组件；`src/App.vue` 提供应用外壳及仓库层接线。
- `src/domain/` 负责财务类型、计算逻辑、展示逻辑和预算预设。
- `src/repositories/` 定义持久化接口及带版本控制的 `localStorage` 实现。
- `src/utils/` 存放共享格式化工具；`src/styles.css` 包含全局样式。
- `tests/` 按源码职责划分为 `domain/`、`repositories/` 和 `utils/` 测试套件。
- `docs/prd/` 和 `docs/spec/` 存放产品需求与实现规范。

业务规则应保留在 `src/domain/` 中；页面不得直接访问 `localStorage`。

## 协作与决策质量

不要仅因用户提出了某个技术方案就机械地照做。应假设用户可能不了解前端技术栈及其权衡：先评估其根本目标，检查现有架构，再推荐最简单且易于维护的方案。清楚说明重要的取舍，纠正错误假设；当另一种做法明显更安全或更优时，应明确提出异议。方向确定合理后，直接完成实现，无需让用户决定底层前端技术细节。

## 构建、测试与开发命令

- `npm install` 根据 `package-lock.json` 安装锁定版本的依赖。
- `npm run dev` 在 `http://127.0.0.1:5173/` 启动 Vite；添加 `-- --port 5174` 可更改端口。
- `npm test` 在 jsdom 环境中单次运行 Vitest 测试套件。
- `npm run test:watch` 在开发过程中重新运行受影响的测试。
- `npm run build` 执行严格的 Vue/TypeScript 检查，然后将生产构建产物写入 `dist/`。

## 编码风格与命名约定

遵循现有 TypeScript 和 Vue 单文件组件风格：使用两个空格缩进、单引号、不加分号，并在多行结构中保留尾随逗号。组件文件使用 `PascalCase.vue`，函数和变量使用 `camelCase`，领域名称应具有描述性，例如 `calculateBudgetSummary`。保持 TypeScript 严格模式，优先使用明确的领域类型，而不是无类型对象。项目未配置格式化工具或代码检查工具，因此应匹配相邻代码的风格，并依靠 `npm run build` 进行类型校验。

## 测试指南

Vitest 使用全局 API、jsdom 和 `tests/setup.ts`。测试文件命名为 `*.test.ts`，并放入与源码职责对应的目录，例如 `tests/domain/calculations.test.ts`。应针对公式边界、数据迁移、持久化失败以及日期/月度行为添加聚焦的测试用例。任何财务公式或仓库规则的变更都应包含回归测试。项目没有数值化覆盖率门槛；应优先保证有意义的分支与边界情况覆盖。

## 提交与拉取请求指南

历史提交倾向使用简短标题，例如 `支持年终奖, 移除无效target`；提交信息应简洁、使用祈使语气，并描述一个逻辑变更。发起 PR 前，运行 `npm test` 和 `npm run build`。PR 应说明用户可见行为、指出受影响的计算或数据迁移、关联相关 issue/规范，并为 UI 变更附上移动端截图。应明确指出数据结构或 `localStorage` 兼容性风险。
