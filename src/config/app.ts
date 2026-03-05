/**
 * 应用元信息，集中维护
 */
export const APP = {
  name: 'FreeNetDebugger',
  version: '0.1.0',
  description: '高颜值、高性能的跨平台网络调试助手',
  github: 'https://github.com/xddcode/free-net-debugger',
} as const;

export const APP_DISPLAY = `${APP.name} v${APP.version}`;
export const APP_ABOUT = `${APP.name} v${APP.version}\n\n${APP.description}`;
