# Video Skills · 聚焦讲图

把一张信息图或已有图片做成讲解视频：镜头跟着内容聚焦，红笔只强调当前重点，短暂停留后消失，配合旁白和固定字幕。

中文显示名是 **聚焦讲图**，技能安装名仍是 **`infographic-explainer`**：infographic 是信息图，explainer 是讲解。保留安装名，避免已有用户重新配置。

![临时红笔批注](examples/preview.png)

[经典画幅样片](examples/infographic-explainer-26s.mp4) · [竖屏样片](examples/infographic-explainer-portrait.mp4) · [下载最新安装包](https://github.com/sinco-z/video-skills/releases/latest) · [技能说明](skills/infographic-explainer/SKILL.md)

## v0.2 改进了什么

- **用区域名安排镜头**：写 `target: "core-idea"`，自动计算缩放和平移。
- **自动生成下划线**：圈定关键词矩形，不再手写 SVG 路径；仍保持一次一条、到时消失。
- **三种画幅预设**：经典 4:3、横屏 16:9、竖屏 9:16，镜头和字幕安全区一起调整。
- **直接导入已有图片**：读取原始尺寸，建立画布，不自动套用无关的演示旁白。
- **自动读取音频时长**：检测旁白超时和重叠，支持自动计算视频总时长；附带可选 Mac 配音脚本。
- **内容与引擎分开**：普通换主题主要修改 `assets/board.svg` 和 `story.json`。

## 安装和调用

下载 Release 中的技能 ZIP，解压后将整个 `infographic-explainer` 文件夹放到助手的技能目录。模板和脚本也必须一起复制，不能只复制 SKILL.md。

- Codex：`~/.codex/skills/infographic-explainer/`
- Claude Code：`~/.claude/skills/infographic-explainer/`
- 其他支持 SKILL.md 的工具：使用其技能目录；也可明确让助手读取仓库中的 SKILL.md。

已有同名文件夹时先比较个人修改，再替换版本。重新启动助手会话使其发现更新。

```text
使用 $infographic-explainer，把下面的内容做成 26 秒中文讲解视频：
[主题和要点]
采用竖屏、白底手绘信息图、淡黄色重点卡片。
镜头跟着讲解聚焦，每次只出现一条红线，停留后消失。
带中文旁白和底部字幕，输出 MP4 和可编辑项目。
```

## 直接运行模板

需要 Node.js 22+、pnpm、FFmpeg/ffprobe，以及 HyperFrames 能启动的 Chromium。首次安装依赖或下载浏览器需要网络。示例音频已经附带，不需要配音 API 密钥。

```sh
node skills/infographic-explainer/scripts/init-project.mjs ../my-explainer --preset portrait
cd ../my-explainer
pnpm install
pnpm preflight
pnpm check
pnpm render --output renders/final.mp4 --quality high --workers 2
```

`--preset` 可选 `classic`、`landscape`、`portrait`。初始化拒绝覆盖已有目录。

导入自己的图片：

```sh
node skills/infographic-explainer/scripts/init-project.mjs ../my-image-video --image /path/to/board.png --preset portrait
```

图片入口建立空的讲解配置，需要补充自己的区域、旁白和时间安排。

## 怎样换内容

修改 `assets/board.svg` 的文字与图形，或在 `story.json` 中选择图片源。随后定义区域：

```json
"regions": {
  "core-idea": {"x":80,"y":60,"width":650,"height":300},
  "keyword": {"x":120,"y":150,"width":260,"height":44}
},
"shots": [{"start":3,"duration":1.2,"target":"core-idea"}],
"annotations": [{"id":"mark1","target":"keyword","start":5.2,"draw":0.7,"end":6.8}]
```

构建时自动把区域换算成镜头坐标和红线路径。区域仍需和真实文字对应；变更字体后要复查。

旁白的实际长度由 ffprobe 测量，不必手填 `audio.duration`。Mac 可按配置里的文案生成测试配音：

```sh
pnpm narrate --voice Tingting --rate 255 --overwrite
pnpm build
```

其他平台直接提供音频即可；渲染不依赖 Mac 配音工具。完整字段、语音和迁移说明见[项目指南](skills/infographic-explainer/references/project-guide.md)。

## 验证和边界

已测试区域构图、自动总时长、禁止红线重叠、禁止意外在运镜时划线、过期音频时长检查。经典和竖屏模板均在 Mac M1 Pro 上通过 HyperFrames 检查并导出 26 秒含旁白的 MP4。也测试了图片导入和新配音生成。

这套流程由助手根据内容选择区域和时间点，程序负责几何计算和渲染；它不是任意图片加音频的一键自动理解系统。密集内容转竖屏时仍需选择更小的区域或重新排版。

字体未打包，Windows/Linux 未做实机验证。需要在目标机器检查字体和最终成片。底图示例是 SVG，未使用 ImageGen；样例语音来自 macOS Tingting。

v0.1 项目可继续使用原引擎。v0.2 使用新的 `version: 2` 配置，应在新目录迁移，不要盲目替换旧项目源码。

模板依赖固定为 HyperFrames 0.8.30、GSAP 3.14.2。自有代码和技能说明采用 [MIT License](LICENSE)，第三方工具和字体适用各自许可。
