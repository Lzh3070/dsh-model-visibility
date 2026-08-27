# dsh-model-visibility

**[English](README.en.md) · 中文**

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的模型可见性插件：控制哪些模型出现在对话界面的模型选择菜单里。

安装后在设置左侧导航提供一个独立的「**模型可见性**」分区页（紧跟「模型」）：

- 🔍 **搜索** —— 按模型名/ID/渠道名实时过滤
- 🎚️ **逐模型开关** —— 隐藏的模型立即从选择器消失，显示即恢复
- 📦 **渠道级批量** —— 一键隐藏/显示某个 Provider 的全部模型
- ♻️ **一键恢复全部** —— 清空隐藏列表
- 🛡️ **零侵入** —— 只写插件自己的隐藏列表，不改你的 Provider 配置；隐藏正在使用的模型不会中断该会话
- 🆕 **新模型自动可见** —— 插件只记录"要隐藏什么"，Provider 新广告的模型默认出现

## 预览

![模型可见性分区页](https://raw.githubusercontent.com/Lzh3070/dsh-model-visibility/main/docs/screenshot.png)

## 要求

- DeepSeek Harness ≥ 0.1.1-rc.2（更早版本未测试）
- Node.js 22+（构建与运行）

## 安装

```sh
dsh plugin --profile web add dsh-model-visibility
```

重启 `dsh web` 后生效。

## 工作原理

- **宿主半**（`lib/index.js`）：持有 `model-visibility` 设置段（隐藏列表），并在源头包装 `ctx.llm.listModels`——会话选择器（`session.models`）与设置页（`llm.models`）拿到的目录都是过滤后的。目录成员资格在 harness 中是"建议性"的，因此隐藏一个正在使用的模型不影响其调度。
- **浏览器半**（`lib/client.js`）：向设置壳注册一个 `settings.section` 分区页；页面状态来自"过滤后目录 ∪ 隐藏条目"的并集，隐藏条目携带隐藏时抓取的显示名快照。

## 卸载

```sh
dsh plugin --profile web remove dsh-model-visibility
```

卸载即恢复原状：插件不写入 Provider 配置，隐藏列表随包删除自动失效。

## License

MIT
