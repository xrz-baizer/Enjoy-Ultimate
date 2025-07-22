# Enjoy English App

这是一个基于Electron的音频学习应用。

- 原项目：https://github.com/ZuodaoTech/everyone-can-use-english

- 当前版本只保留音频核心功能，增加了一些自定义常用功能。

## 启动命令

```bash
yarn install
yarn start

# 在 settings.json 指定 LibraryPath 
# /Users/Work/Pagoda/this/Enjoy-Ultimate/enjoy/tmp/settings.json
yarn dev
```

## 打包命令

```bash
# 打包为macOS应用
yarn package  # 打包应用
yarn make     # 创建安装包 （/out/xxx）

yarn package --version=1.0.0  # 打包应用并指定版本号
yarn make --version=1.0.0     # 创建安装包并指定版本号（/out/xxx）
```

```bash
# 打包为Windows应用 (32位)
yarn package --platform=win32
yarn make --platform=win32

# 打包为Windows应用 (64位)
yarn package --platform=win32 --arch=x64
yarn make --platform=win32 --arch=x64
```

## 关键模块

### 布局组件
- `/src/renderer/components/layouts/sidebar.tsx` - 侧边栏组件，控制应用导航
- `/src/renderer/components/layouts/title-bar.tsx` - 标题栏组件

### 路由
- `/src/renderer/router.tsx` - 应用路由配置

### 音频相关组件
- `/src/renderer/pages/audios.tsx` - 音频列表页面
- `/src/renderer/components/audios/audios-component.tsx` - 音频列表组件，包含排序功能
- `/src/renderer/pages/audio.tsx` - 单个音频详情页面

### 音频播放器组件
- `/src/renderer/components/medias/media-shadow-player.tsx` - 音频播放器主组件
- `/src/renderer/components/medias/media-bottom-panel/media-player-controls.tsx` - 播放器控制面板，包含播放速率控制
- `/src/renderer/components/medias/media-bottom-panel/media-current-recording.tsx` - 录音功能面板

### 音频右侧面板组件
- `/src/renderer/components/medias/media-right-panel/media-right-panel.tsx` - 右侧面板主组件，包含Translation、Note、Analysis标签页
- `/src/renderer/components/medias/media-right-panel/media-caption-note.tsx` - Note功能组件
- `/src/renderer/components/medias/media-right-panel/media-caption-actions.tsx` - 右下角设置按钮，控制IPA和Notes显示

## 修改应用图标

应用图标文件位于 `/assets/` 目录下，包含以下几个文件：

- `icon.png` - 用于 Linux 和基本显示的PNG格式图标
- `icon.ico` - 用于 Windows 的ICO格式图标
- `icon.icns` - 用于 macOS 的ICNS格式图标

要修改应用图标，请按照以下步骤操作：

1. 准备新的图标文件，建议尺寸为1024x1024像素
2. 将新图标转换为所需的三种格式（PNG、ICO、ICNS）
   - 可以使用在线工具如 [iConvert](https://iconverticons.com/) 或 [CloudConvert](https://cloudconvert.com/) 进行转换
   - 对于macOS用户，也可以使用系统自带的预览应用和图标合成器
3. 替换 `/assets/` 目录下的对应图标文件
4. 重新构建应用：
   ```bash
   yarn package
   yarn make
   ```

注意：图标配置在 `forge.config.js` 文件中设置，默认使用 `./assets/icon` 作为基础路径，不同的构建目标会使用对应格式的图标文件。
