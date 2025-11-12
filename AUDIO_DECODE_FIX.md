# 音频解码错误完整修复方案

## 问题总结
偶现的 `PIPELINE_ERROR_DECODE: Failed to send audio packet for decoding` 错误，错误信息显示只传输了 **4 字节数据包**，这是 M4A 文件头被截断的标志。

## 根本原因分析

### 技术细节
M4A 文件开头是一个 ftyp box（文件类型头），结构如下：
```
Offset  Size  Type    Content
------  ----  ----    -------
0       4     Size    Box大小（通常32字节）
4       4     Type    "ftyp"
8       4     Brand   "M4A "
...
```

**4-byte packet** 意味着只读取了前 4 字节（box 大小字段），后续内容被截断。

### 触发条件
1. **双播放器竞争**：Vidstack 和 WaveSurfer 同时通过 `enjoy://` 协议请求同一 M4A 文件
2. **缓存损坏**：Electron 的 `net.fetch()` 返回了部分/缓存的响应
3. **M4A 格式**：容器格式需要完整解析头部，比 MP3 更容易出错
4. **时序问题**：文件句柄在第二次请求时被占用

## 修复方案 - 快速热修复

### 1. 自动重试机制 ✅
**文件**：`src/renderer/components/medias/media-left-panel/media-provider.tsx`

**修改内容**：
- 添加 `retryCountRef` 跟踪重试次数
- 添加 `retryTrigger` 状态触发重新加载
- 在 `onError` 中检测 `PIPELINE_ERROR_DECODE`
- 自动重试 1 次（对用户静默，无感知）
- 通过 `key` 属性强制 Vidstack 重新挂载

**工作流程**：
```
错误发生 → 检测 PIPELINE_ERROR_DECODE → retryCount < 1 ?
  → 是：增加计数，触发 retryTrigger，重新挂载播放器
  → 否：显示错误给用户
```

**关键代码**：
```typescript
if (isPipelineError && retryCountRef.current < maxRetries) {
  retryCountRef.current += 1;
  console.warn(`[MediaProvider] Auto-retrying (${retryCountRef.current}/${maxRetries})`);
  setRetryTrigger(prev => prev + 1);  // 触发重新加载
  return;  // 不显示错误
}
```

### 2. 协议处理器增强 ✅
**文件**：`src/main.ts`

**修改内容**：
- **文件验证**：检查文件是否存在，避免 404
- **缓存控制**：添加 `Cache-Control: no-cache` 头，防止缓存损坏
- **字节监控**：监控实际传输字节数
- **详细日志**：记录请求时间、文件大小、传输字节、耗时
- **SIZE MISMATCH 警告**：如果传输字节数 ≠ 文件大小，输出警告

**网络日志示例**：
```
[Protocol] Request: enjoy://library/audios/3bd4402....m4a -> file:///path/to/file.m4a
[Protocol] File size: 2376543 bytes
[Protocol] Transfer complete: 2376543/2376543 bytes in 45ms for 3bd4402....m4a
```

**如果出现 4-byte 错误，会看到**：
```
[Protocol] SIZE MISMATCH! Expected 2376543 bytes, got 4 bytes for 3bd4402....m4a
```

### 3. M4A 格式警告 ✅
**文件**：`src/renderer/components/medias/media-left-panel/media-provider.tsx`

**修改内容**：
- 检测是否使用未压缩的 M4A 文件
- 如果是 M4A 且没有 `.compressed.mp3` 版本，输出警告
- 建议用户重新导入并启用压缩

**警告日志**：
```
[MediaProvider] WARNING: Using uncompressed M4A format for enjoy://library/audios/3bd4402....m4a.
This may cause intermittent PIPELINE_ERROR_DECODE errors.
Consider re-importing with compression enabled.
```

## 修改文件列表

1. `src/renderer/components/medias/media-left-panel/media-provider.tsx`
   - 导入 `useState`
   - 添加 `retryCountRef` 和 `retryTrigger`
   - 增强 `onError` 处理器
   - 添加 M4A 格式检查和警告
   - 添加 `key` 属性实现重新挂载

2. `src/main.ts`
   - 协议处理器改为 `async`
   - 添加文件存在性检查
   - 添加字节监控 ReadableStream
   - 添加详细网络日志
   - 添加 Cache-Control 头

## 测试验证步骤

### 1. 启动应用并查看日志

```bash
yarn dev
```

在 Terminal 和 DevTools Console 中都会看到日志。

### 2. 正常加载测试

**操作**：点击任意音频

**预期日志**：
```
# Terminal (主进程)
[Protocol] Request: enjoy://library/audios/xxx.m4a -> file://...
[Protocol] File size: 2376543 bytes
[Protocol] Transfer complete: 2376543/2376543 bytes in 45ms

# DevTools Console (渲染进程)
[MediaProvider] Reset retry count for new media: enjoy://...
[MediaProvider] WARNING: Using uncompressed M4A format... (如果是 M4A)
[MediaProvider] Rendering player for src: enjoy://...
[MediaProvider] onCanPlayThrough - media ready
```

### 3. 错误重试测试

**如果仍然出现错误**，你会看到：

```
# 第一次尝试失败
[MediaProvider] Vidstack error: PIPELINE_ERROR_DECODE...
[MediaProvider] Auto-retrying (1/1) for PIPELINE_ERROR_DECODE

# 立即自动重试（用户无感知）
[MediaProvider] Rendering player for src: enjoy://... (retryTrigger 改变)
[MediaProvider] onCanPlayThrough - media ready (成功！)
```

**如果重试后仍失败**：
```
[MediaProvider] Auto-retrying (1/1) for PIPELINE_ERROR_DECODE
[MediaProvider] Vidstack error: PIPELINE_ERROR_DECODE...
[MediaProvider] Retry failed after 1 attempts
(显示错误提示框)
```

### 4. 网络问题诊断

**如果看到 SIZE MISMATCH 警告**：
```
[Protocol] SIZE MISMATCH! Expected 2376543 bytes, got 4 bytes for xxx.m4a
```

这确认了问题：文件传输被截断，只传输了 4 字节。说明：
- Electron 网络缓存问题
- 文件系统访问竞争
- 可能需要重启应用清除缓存

### 5. 快速切换压力测试

**操作**：在音频列表中快速连续点击不同音频（5-10次）

**预期**：
- 大部分情况下正常加载
- 偶尔出现错误时，自动重试成功
- Console 中看到重试日志但用户无感知
- 没有看到错误提示框（除非重试也失败）

## 成功指标

✅ **完全成功**：
- 不再出现 `PIPELINE_ERROR_DECODE` 错误
- 或仅在第一次尝试时出现，重试后成功（用户无感知）

✅ **部分成功**：
- 错误频率显著降低（从频繁出现 → 偶尔出现）
- 重试机制捕获大部分错误
- 网络日志帮助定位残留问题

❌ **失败**：
- 错误仍然频繁出现
- 重试后仍然失败
- SIZE MISMATCH 警告持续出现

## 问题定位指南

### 如果修复后仍有问题

请提供以下完整日志：

**1. Terminal 日志（主进程）**：
```
[Protocol] Request: enjoy://...
[Protocol] File size: ...
[Protocol] Transfer complete: ...
[Protocol] SIZE MISMATCH! ... (如果有)
```

**2. DevTools Console 日志（渲染进程）**：
```
[MediaProvider] Reset retry count...
[MediaProvider] WARNING: Using uncompressed M4A... (如果有)
[MediaProvider] Vidstack error: ...
[MediaProvider] Auto-retrying... (如果有)
```

**3. 错误发生的模式**：
- 是否只在特定音频文件上发生？
- 是否只在快速切换时发生？
- 重试是否有效？（看日志中是否有 "Auto-retrying" 后成功）

### 日志解读

| 日志内容 | 含义 | 建议 |
|---------|------|------|
| `SIZE MISMATCH! ... got 4 bytes` | 只传输了 4 字节 | 确认问题，重启应用清除缓存 |
| `Auto-retrying (1/1)` 后成功 | 重试机制工作正常 | 无需操作，静默修复 |
| `Retry failed after 1 attempts` | 重试也失败 | 可能需要增加重试次数或检查文件 |
| `WARNING: Using uncompressed M4A` | 使用次优格式 | 建议重新导入启用压缩 |
| `Using compressed MP3 format` | 使用最优格式 | 很好！ |

## 长期优化建议

如果当前修复仍不够彻底，可以考虑：

### 方案 A：增加重试次数
修改 `media-provider.tsx:119`：
```typescript
const maxRetries = 2;  // 从 1 改为 2
```

### 方案 B：添加重试延迟
在 `media-provider.tsx` 的重试逻辑中添加延迟：
```typescript
if (isPipelineError && retryCountRef.current < maxRetries) {
  retryCountRef.current += 1;
  console.warn(`[MediaProvider] Auto-retrying in 100ms...`);

  setTimeout(() => {
    setRetryTrigger(prev => prev + 1);
  }, 100);  // 延迟 100ms 重试
  return;
}
```

### 方案 C：强制压缩所有音频
在音频导入时始终启用压缩：
- 修改导入逻辑，移除 `compressing` 参数
- 或提供批量压缩工具

### 方案 D：架构重构
让 WaveSurfer 完全依赖 Vidstack 的 audio 元素，避免重复加载：
```typescript
// 在 initializeWavesurfer 中
const ws = WaveSurfer.create({
  media: mediaProvider,  // 直接使用 Vidstack 的 audio 元素
  // 不使用 fetch(media.src)
});
```

## 技术细节：为什么重试有效？

1. **第一次失败**：
   - Vidstack 和 WaveSurfer 同时请求
   - 网络缓存返回损坏的响应（4 字节）
   - PIPELINE_ERROR_DECODE

2. **重试成功**：
   - 组件重新挂载（通过 key 变化）
   - 旧的文件句柄已释放
   - 缓存可能已清除或更新
   - 时序不再冲突
   - 完整文件成功加载

3. **Cache-Control 头的作用**：
   - `no-cache` 强制验证缓存
   - `no-store` 禁止存储响应
   - `must-revalidate` 过期后必须重新验证
   - 减少缓存损坏的概率

## 总结

**修复方式**：快速热修复（自动重试 + 详细日志 + M4A 警告）

**核心优势**：
- ✅ 用户无感知（静默重试）
- ✅ 无性能损失（不添加延迟）
- ✅ 详细日志（便于诊断）
- ✅ 风险可控（改动小，易回滚）

**预期效果**：
- 错误频率显著降低
- 大部分错误通过重试自动修复
- 日志帮助定位残留问题
- 为未来优化提供数据支持

---

**修复完成时间**：2025-11-12
**修复版本**：快速热修复 v1.0
**修改文件数**：2 个
