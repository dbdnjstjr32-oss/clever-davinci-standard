#!/usr/bin/env node
/**
 * 소스 수정 -> 웹 번들 재빌드 -> 앱인토스 샌드박스 앱 재실행까지 한 번에 처리한다.
 *
 * granite dev(포트 8081/8082)는 라이브 리로드가 아니라 dist/ 폴더를 정적으로 서빙하므로,
 * 실기기에 코드 변경을 반영하려면 매번 (1) 웹 번들을 다시 만들고 (2) 샌드박스 앱을
 * 완전히 재시작해야 한다. 이 스크립트가 그 두 단계를 대신한다.
 *
 * 사전 조건: `npm run dev`(granite dev)가 이미 실행 중이어야 하고, adb로 실기기가
 * 연결되어 있어야 한다(USB 디버깅). 실행: `npm run reload:device`
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SANDBOX_PACKAGE = process.env.SANDBOX_PACKAGE || 'viva.republica.toss.test';

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', cwd: PROJECT_ROOT, ...opts });
}

function findAdb() {
  const candidates = [
    'adb', // PATH에 있으면 그대로 사용
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      execSync(`"${candidate}" version`, { stdio: 'ignore' });
      return candidate;
    } catch {
      // 다음 후보로 계속
    }
  }
  throw new Error('adb를 찾지 못했습니다. ANDROID_HOME 환경변수를 설정하거나 PATH에 adb를 추가해 주세요.');
}

function getAppName() {
  const configPath = path.join(PROJECT_ROOT, 'granite.config.ts');
  const text = fs.readFileSync(configPath, 'utf8');
  const match = text.match(/appName:\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error(`granite.config.ts에서 appName을 찾지 못했습니다: ${configPath}`);
  return match[1];
}

function main() {
  const appName = getAppName();
  const scheme = `intoss://${appName}`;

  console.log(`▶ 앱: ${appName}`);
  console.log(`▶ 스킴: ${scheme}`);

  // 1. 웹 번들 재빌드 (granite dev의 http-server가 서빙하는 dist/ 루트 구조에 맞춰야 하므로
  //    `npm run build`(ait build)가 아니라 expo export를 직접 사용한다 - ait build는
  //    dist/web/ 하위에 결과물을 넣어서 http-server dist 구조와 어긋난다).
  run('npx expo export --platform web');

  // 2. adb로 기기 확인
  const adb = findAdb();
  const devices = execSync(`"${adb}" devices`).toString();
  const connected = devices
    .split('\n')
    .slice(1)
    .some(line => line.trim().endsWith('device'));
  if (!connected) {
    throw new Error('연결된 기기가 없습니다. USB 디버깅을 켜고 케이블을 연결한 뒤 다시 시도하세요.');
  }

  // 3. Metro/웹 포트 forward 확인 (granite dev 기본 포트: 8081, 8082)
  run(`"${adb}" reverse tcp:8081 tcp:8081`);
  run(`"${adb}" reverse tcp:8082 tcp:8082`);

  // 4. 샌드박스 앱을 완전히 재시작해야 새 번들을 다시 읽어온다 (그냥 스킴만 재호출하면
  //    기존에 떠 있던 인스턴스를 그대로 포그라운드로 가져올 뿐 새로고침되지 않는다).
  try {
    run(`"${adb}" shell am force-stop ${SANDBOX_PACKAGE}`);
  } catch {
    console.warn(`⚠ ${SANDBOX_PACKAGE} force-stop 실패 (설치 안 되어 있거나 이미 종료됨) - 계속 진행합니다.`);
  }
  run(`"${adb}" shell am start -a android.intent.action.VIEW -d "${scheme}"`);

  console.log('\n✅ 완료. 기기 화면에 Bundling ...% 표시 후 새 화면이 뜨는지 확인하세요.');
}

main();
