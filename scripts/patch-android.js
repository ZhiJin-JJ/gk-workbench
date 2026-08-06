// 在 cap sync 之后自动给生成的安卓工程打补丁：
// 让 WebView 内的 getUserMedia（录音/相机）能正常工作。
// 关键：Android 运行时危险权限（RECORD_AUDIO / CAMERA）必须在「用户手势」上下文里申请，
// 否则很多 ROM（尤其国产）不会弹授权窗，导致 getUserMedia 被系统拒绝、麦克风失效。
// 做法：覆写 WebChromeClient.onPermissionRequest —— 它本就在用户点录音时触发（用户手势），
// 在其中申请系统运行时权限，授权后再放行 Web 层媒体权限；并在 onCreate 做一次预申请作为兜底。
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
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
  private static final int REQ_REC_PERM = 0x51a; // 媒体运行时权限请求码
  private PermissionRequest pendingMediaRequest = null;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 冷启动预申请媒体权限（部分 ROM 在 onCreate 阶段不弹窗，仅作为兜底；真正的弹窗在 onPermissionRequest 中）
    requestMediaPermissionsIfNeeded();
  }

  private void requestMediaPermissionsIfNeeded() {
    String[] perms = { Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA };
    ArrayList<String> need = new ArrayList<>();
    for (String p : perms) {
      if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) need.add(p);
    }
    if (!need.isEmpty()) {
      ActivityCompat.requestPermissions(this, need.toArray(new String[0]), REQ_REC_PERM);
    }
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == REQ_REC_PERM && pendingMediaRequest != null) {
      boolean granted = true;
      for (int g : grantResults) if (g != PackageManager.PERMISSION_GRANTED) granted = false;
      if (granted) pendingMediaRequest.grant(pendingMediaRequest.getResources());
      else pendingMediaRequest.deny();
      pendingMediaRequest = null;
    }
  }

  @Override
  protected BridgeWebChromeClient createWebChromeClient(Bridge bridge) {
    return new BridgeWebChromeClient(bridge) {
      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        runOnUiThread(new Runnable() {
          @Override
          public void run() {
            // 用户点录音触发此处 = 用户手势上下文，ROM 会正常弹窗。
            // 先确保系统运行时权限已授予，再放行 Web 层媒体权限。
            String[] perms = { Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA };
            ArrayList<String> need = new ArrayList<>();
            for (String p : perms) {
              if (ContextCompat.checkSelfPermission(MainActivity.this, p) != PackageManager.PERMISSION_GRANTED) need.add(p);
            }
            if (need.isEmpty()) {
              request.grant(request.getResources());
            } else {
              pendingMediaRequest = request;
              ActivityCompat.requestPermissions(MainActivity.this, need.toArray(new String[0]), REQ_REC_PERM);
            }
          }
        });
      }
    };
  }
}
`;
  fs.writeFileSync(file, patched, 'utf8');
  console.log('[patch-android] 已为 ' + file + ' 注入 WebView 媒体授权 + 用户手势权限申请');
}

try {
  patch();
} catch (e) {
  console.log('[patch-android] 补丁执行出错（已忽略，不阻断构建）: ' + e.message);
}
