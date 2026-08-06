// Capacitor 配置（JS 版，无需安装 TypeScript）
// 因 package.json 设置了 "type": "module"，本文件按 ESM 解析
const config = {
  appId: 'com.gongkao.workbench',
  appName: '公考工作台',
  // 指向构建产物目录（由 build-app.mjs 生成）
  webDir: 'dist',
  server: {
    // 若你的同步后端部署在公网，改成实际地址；否则保持本地同步策略时留空
    // url: 'https://your-server.example.com',
    androidScheme: 'https',
  },
  // 允许访问本地网络（同 Wi-Fi 同步后端）与摄像头/麦克风
  android: {
    allowMixedContent: true,
  },
  plugins: {},
};

export default config;
