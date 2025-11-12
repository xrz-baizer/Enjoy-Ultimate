# 音频解码错误修复验证指南

## 问题总结
偶现的 `PIPELINE_ERROR_DECODE` 错误，发生在点击音频文件时。第二次点击同一音频则正常。

## 根本原因
**资源竞争条件：**
1. Vidstack MediaPlayer 通过 `<VidstackMediaPlayer src={media.src}>` 加载音频
2. WaveSurfer 同时通过 `fetch(media.src)` 加载同一音频文件
3. 旧组件的资源未及时清理，导致文件访问冲突

## 修复内容

### 1. MediaProvider 组件 (media-provider.tsx)
✅ **立即清理 mediaProvider 引用**
- cleanup 函数中首先执行 `setMediaProvider(null)`
- 这会阻止 WaveSurfer 在过渡期间初始化（因为有 `if (!mediaProvider) return` 检查）

✅ **调整 useEffect 依赖**
- 从 `[media?.src]` 改为 `[]`
- 确保只在组件真正卸载时执行清理，而不是在 src 改变时

✅ **安全的播放器清理**
- 移除会出错的 `destroy()` 调用
- 改用 `pause()` 方法安全地停止播放

### 2. MediaLeftPanel 组件 (media-left-panel.tsx)
✅ **强制组件重新挂载**
- 为 TabsContent 和 MediaProvider 添加 `key={media?.id}`
- 确保切换音频时，旧组件完全卸载，新组件全新挂载

### 3. MediaShadowProvider (media-shadow-provider.tsx)
✅ **增强调试日志**
- 在 WaveSurfer 初始化时记录 media.src
- 当 mediaProvider 为 null 时记录跳过信息

## 修复原理

**切换音频时的正确流程：**

```
用户点击音频 B
    ↓
media 状态更新为 B
    ↓
MediaProvider 组件因 key={media?.id} 变化开始卸载（A）
    ↓
cleanup 执行：
  1. setMediaProvider(null) ← 立即阻止 WaveSurfer 初始化
  2. player.current.pause() ← 停止播放
    ↓
新的 MediaProvider 组件挂载（B）
    ↓
VidstackMediaPlayer 加载音频 B
    ↓
onCanPlayThrough 触发 → setMediaProvider(B的audio元素)
    ↓
WaveSurfer useEffect 触发（mediaProvider 从 null → B的元素）
    ↓
WaveSurfer 初始化成功（使用 B 的 mediaProvider）
```

## 验证步骤

### 1. 启动应用并打开 DevTools Console

```bash
yarn dev
```

### 2. 正常切换测试

1. 点击音频列表中的**音频 A**
2. 观察 Console，应该看到：
   ```
   [MediaLeftPanel] Media changed to: <id> (<name>)
   [MediaProvider] Component mounted with src: enjoy://...
   [MediaProvider] Rendering player for src: enjoy://...
   [MediaProvider] onCanPlayThrough - media ready for src: enjoy://...
   [MediaProvider] Setting audio provider
   [MediaShadowProvider] Initializing WaveSurfer for: enjoy://...
   ```

3. 点击**音频 B**，应该看到：
   ```
   [MediaProvider] Cleanup triggered - component unmounting
   [MediaProvider] Pausing player
   [MediaProvider] Cleanup completed
   [MediaLeftPanel] Media changed to: <id> (<name>)
   [MediaProvider] Component mounted with src: enjoy://...(B的地址)
   [MediaProvider] Rendering player for src: enjoy://...(B的地址)
   [MediaProvider] onCanPlayThrough - media ready for src: enjoy://...(B的地址)
   [MediaProvider] Setting audio provider
   [MediaShadowProvider] Initializing WaveSurfer for: enjoy://...(B的地址)
   ```

### 3. 快速切换压力测试

1. 在音频列表中**快速连续点击**不同的音频（5-10次）
2. 观察是否还出现 `PIPELINE_ERROR_DECODE` 错误
3. 检查日志中是否有 "Skipping WaveSurfer init - no mediaProvider" 消息
   - 如果有，说明保护机制正常工作

### 4. 期望结果

✅ **成功标准：**
- 不再出现偶现的 `PIPELINE_ERROR_DECODE` 错误
- 每次切换音频时都能看到完整的 cleanup → mount 日志序列
- 快速切换时不会出现资源冲突

❌ **失败标准：**
- 仍然偶现解码错误
- Console 中出现错误堆栈
- 日志序列不完整或顺序混乱

## 如果问题仍然存在

如果修复后仍然出现问题，请提供以下信息：

1. **完整的 Console 日志**（从点击音频开始到错误发生）
2. **错误发生的频率**（每次都发生？10次发生1次？）
3. **触发条件**
   - 是否只在特定音频上发生？
   - 是否只在快速切换时发生？
   - 是否与音频文件大小或格式有关？

4. **系统环境**
   - 操作系统
   - 音频文件格式和大小
   - 是否启用了压缩音频

## 进一步优化建议（可选）

如果当前修复仍不够，可以考虑：

1. **添加防抖延迟**：在切换音频时添加 50-100ms 延迟
2. **文件锁检查**：在协议处理器中添加文件访问状态检查
3. **重试机制**：在解码失败时自动重试一次
4. **架构重构**：让 Vidstack 和 WaveSurfer 共享单一音频源实例

---

**修改文件列表：**
- `src/renderer/components/medias/media-left-panel/media-provider.tsx`
- `src/renderer/components/medias/media-left-panel/media-left-panel.tsx`
- `src/renderer/context/media-shadow-provider.tsx`
