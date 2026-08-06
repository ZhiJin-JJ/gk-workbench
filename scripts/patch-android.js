// 在 cap sync 之后自动给生成的安卓工程打补丁：
// 覆写 WebChromeClient.onPermissionRequest，让 WebView 内的 getUserMedia
//（录音/相机）能正常授权。否则 Capacitor 默认会拒绝 WebView 的媒体权限请求。
// 仅 patch，出错也退出 0，避免阻断整体构建（麦克风修复为尽力而为）。

const fs = require('fs');
const path = require('path');

function findMainActivity() {
  const root = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java');
  if (!fs.existsSync(root)) return null;
  let found = null;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'MainActivity.java') found = p;
    }
  };
  walk(root);
  return found;
}

function patch() {
  const file = findMainActivity();
  if (!file) {
    console.log('[patch-android] 未找到 MainActivity.java，跳过');
    return;
  }
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('onPermissionRequest')) {
    console.log('[patch-android] 已打过补丁，跳过');
    return;
  }
  const m = src.match(/package\s+([\w.]+);/);
  const pkg = m ? m[1] : 'com.gongkao.workbench';

  const patched = `package ${pkg};

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import android.webkit.PermissionRequest;

public class MainActivity extends BridgeActivity {
  @Override
  protected BridgeWebChromeClient createWebChromeClient(Bridge bridge) {
    return new BridgeWebChromeClient(bridge) {
      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        runOnUiThread(new Runnable() {
          @Override
          public void run() {
            request.grant(request.getResources());
          }
        });
      }
    };
  }
}
`;
  fs.writeFileSync(file, patched, 'utf8');
  console.log('[patch-android] 已为 ' + file + ' 注入 WebView 媒体权限授权');
}

try {
  patch();
} catch (e) {
  console.log('[patch-android] 补丁执行出错（已忽略，不阻断构建）: ' + e.message);
}
