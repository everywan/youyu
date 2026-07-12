# 有余

[![Deploy](https://github.com/everywan/youyu/actions/workflows/deploy.yml/badge.svg)](https://github.com/everywan/youyu/actions/workflows/deploy.yml)
[![在线体验](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E4%BD%93%E9%AA%8C-everywan.github.io-2ea44f)](https://everywan.github.io/youyu/)
[![License](https://img.shields.io/github/license/everywan/youyu)](LICENSE)

一个隐私优先、移动端优先的财务自由规划工具。

维护资产、三档生活预算和持续收入后，「有余」可以帮助你了解：

- 当前的财务自由等级
- 资产收益对生活预算的覆盖程度
- 按当前收支预计达到各档财务自由的时间
- 收入、预算和收益率变化对目标的影响

「有余」不是逐笔记账工具，也不提供投资建议。

## 在线体验

[https://everywan.github.io/youyu/](https://everywan.github.io/youyu/)

## 隐私说明

财务数据只在当前浏览器中处理，并保存在 `localStorage`。项目没有账号系统、云端数据库或财务数据上传接口。

你可以在设置页导出或恢复 JSON 备份，也可以清空全部本地数据。清理浏览器数据、使用无痕模式或更换设备都可能造成数据丢失，建议定期备份。

网站使用 GoatCounter 统计访问量，但不会发送财务数据。浏览器扩展、设备环境和自行部署时加入的第三方服务不在上述隐私承诺范围内。

## 本地开发

需要 Node.js 和 npm。

```bash
npm install
npm run dev
```

应用默认运行在 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。

常用命令：

```bash
npm test          # 运行测试
npm run build     # 类型检查并构建生产版本
npm run test:watch
```

## 技术与结构

项目使用 Vue 3、TypeScript、Vite、Ant Design Vue 和 Vitest。

```text
src/
  pages/          页面与交互
  domain/         业务类型、财务计算与展示规则
  repositories/   数据接口及 localStorage 实现
  utils/          通用格式化工具
tests/            与源码职责对应的测试
docs/             产品需求与实现规范
```

财务规则应放在 `src/domain/`，页面通过 Repository 读写数据，不直接访问 `localStorage`。修改财务公式或持久化规则时，请同步补充对应测试。

更完整的产品与实现说明见：

- [产品定义](docs/%E4%BA%A7%E5%93%81%E5%AE%9A%E4%B9%89.md)
- [MVP 实现规范](docs/spec/mvp-h5-first-version-spec.md)

## License

[MIT](LICENSE)
