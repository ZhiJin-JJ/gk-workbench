// 在 cap sync 之后自动给生成的安卓工程打补丁：
// 1) 覆写 WebChromeClient.onPermissionRequest，让 WebView 内的 getUserMedia（录音/相机）
//    能拿到 Web 层授权。否则 Capacitor 默认会拒绝 WebView 的媒体权限请求。
// 2) 覆写 onCreate，主动申请 Android 系统运行时危险权限（RECORD_AUDIO / CAMERA）。
//    Web 层授权只是第一道关；系统层若未授权，getUserMedia 仍会被系统拒绝，麦克风因此失效。
// 仅 patch，出错也退出 0，避免阻断整体构建（媒体能力为尽力而为）。

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
  // 用自定义标记判断是否已补全（同时含 Web 授权与系统权限请求）
  if (src.includes('REQ_REC_PERM')) {
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
import android.os.Bundle;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.Manifest;

public class MainActivity extends BridgeActivity {
  private static final int REQ_REC_PERM = 0x51a; // 媒体运行时权限请求码

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 主动申请麦克风 / 相机系统运行时权限，否则 WebView 内 getUserMedia 会被系统拒绝
    String[] perms = { Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA };
    boolean need = false;
    for (String p : perms) {
      if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) need = true;
    }
    if (need) ActivityCompat.requestPermissions(this, perms, REQ_REC_PERM);
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
  }

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
  console.log('[patch-android] 已为 ' + file + ' 注入 WebView 媒体授权 + 运行时权限申请');
}

try {
  patch();
} catch (e) {
  console.log('[patch-android] 补丁执行出错（已忽略，不阻断构建）: ' + e.message);
}
