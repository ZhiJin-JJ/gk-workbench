/* 应用配置（前端运行时可读）
 * publicUrl：已部署的【网页版】公网地址（手机浏览器可访问），用于 APK 内生成可扫码打开的二维码。
 *   - 留空时，APK（离线安装包）内不会生成虚假二维码，只会提示说明。
 *   - 填了之后，APK 与网页版都会优先用此地址生成二维码（跨网络也能扫）。
 * 例（GitHub Pages）： https://<你的用户名>.github.io/gk-workbench/
 * 例（自建服务器）：   https://你的域名/
 */
window.APP_CONFIG = window.APP_CONFIG || {
  publicUrl: 'https://zhijin-jj.github.io/gk-workbench/',
};
