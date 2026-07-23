# 아카데미아 아틀리에 — 전체 경로 QA 테스트 리포트

- 테스트 일자: 2026-07-23
- 테스트 대상 커밋: `1d1cbbd` (feat: Add observer mode, custom scholar characters, 5x docent lines & spring modal animations)
- 테스트 방법: `expo start --web` 로 앱을 직접 구동 후, 브라우저에서 Home 화면부터 시작해 모든 분기(로그인/관찰자 모드, 각 탭, 글쓰기, 댓글, 리액션, 프로필, 설정, 로그아웃)를 조합해 실제로 클릭/입력하며 검증. 코드 정독을 병행해 UI로 재현하기 어려운 경로(토스 인앱 전용 로그인 등)는 코드 리뷰로 보완.
- 실제 Firebase 프로젝트(`davinchi-7b7cf`, Firestore `academia-atelier`)에 연결된 상태로 테스트했습니다 (아래 "데이터 관련 참고사항" 확인 필요).

---

## 1. 테스트한 경로 요약

```
Home
 ├─ (미로그인) "입학하기" → Auth 모달
 │    ├─ 관찰자로 둘러보기 → Path (읽기 전용, 샘플 데이터만 표시)
 │    │    ├─ 메이커 → MakerFeed (읽기만 가능, 리액션/글쓰기/프로필 클릭 시 가드 동작 확인)
 │    │    └─ 일상 → Feed → StoryDetail (마찬가지로 가드 동작 확인)
 │    └─ (웹 개발모드 폴백) 이메일 로그인/가입
 │         ├─ 빈 값 제출 → 인라인 검증 메시지
 │         ├─ 잘못된 이메일 형식 → Firebase 에러
 │         ├─ 약한 비밀번호(가입) → Firebase 에러
 │         └─ 정상 가입 → Path 진입, 세션 지속 확인(새로고침 후에도 로그인 유지)
 └─ (로그인/관찰자 상태) "입학하기" → Path 로 즉시 진입 (Auth 스킵)

Path (로그인 상태)
 ├─ 메이커 → MakerFeed → Write(category=maker) → 취소/등록
 └─ 일상 → Feed → 리액션 토글, StoryDetail → 댓글 작성 → Write(category=daily)

Feed / MakerFeed / StoryDetail 상단 아이콘
 ├─ 프로필 아이콘 → Profile → 소개글 수정 → Settings
 └─ 설정: 닉네임 무작위 변경 / 로그아웃 / 앱 정보
```

---

## 2. 정상 동작 확인 (Working)

- Home → Auth → 관찰자 진입 / 이메일 가입·로그인 → Path 진입까지 전체 흐름 정상.
- 로그인 세션이 브라우저 새로고침 후에도 유지됨 (Firebase Auth persistence 정상).
- Feed/MakerFeed/StoryDetail의 리액션(👑🏺🧪🕯️) 클릭 → Firestore 트랜잭션으로 즉시 반영, 재클릭 시 토글 해제까지 정상. 감정가(₩ 표시) 실시간 재계산도 정상.
- StoryDetail 방명록(댓글) 작성 → 실시간 반영, `commentCount` 카운트 자동 증가까지 정상.
- Profile 화면: 소개글(bio) 수정 및 저장 정상.
- 회원가입 시 무작위 익명 닉네임/아바타 자동 부여, `users/{uid}` 문서 자동 생성 정상.
- 관찰자 모드는 Firestore 인증이 없어 실제 게시글을 읽지 못하므로 항상 하드코딩된 샘플 3건만 노출 — `firestore.rules`의 `allow read: if isAuthenticated();` 설계와 `data.js`의 fallback 로직이 의도대로 맞물려 동작함(아래 3.5 참고).
- 설정 화면의 로그아웃/닉네임 변경은 `window.confirm()`을 웹 전용으로 명시적으로 분기 처리해 두어(주석: "react-native-web's Alert.alert doesn't render anything...") 코드상 정상 동작 확인. (실제 확인창은 브라우저 네이티브 다이얼로그라 자동화 클릭으로는 끝까지 재현하지 못했으나, 소스상 로직은 올바름)

---

## 3. 발견된 이슈

### 3.1 [심각] 웹에서 "실패담 작성 취소"가 완전히 먹통이 됨
- 위치: [WriteScreen.js:30-47](src/screens/WriteScreen.js#L30-L47)
- 재현: 글쓰기 화면에서 내용을 한 글자라도 입력한 뒤 "취소"를 누르면 **아무 일도 일어나지 않습니다** (다이얼로그도, 화면 전환도 없음). 기기 뒤로가기(`useTossBackGuard`)도 동일 함수(`confirmLeave`)를 호출하므로 똑같이 먹통입니다.
- 원인: `confirmLeave`가 `Alert.alert(title, message, [...2개 버튼])`을 호출하는데, **react-native-web에서 버튼 배열이 있는 `Alert.alert`는 아무것도 렌더링하지 않는 완전한 무동작(no-op)** 입니다. 실제로 [SettingsScreen.js:10-12](src/screens/SettingsScreen.js#L10-L12)에 "react-native-web's Alert.alert doesn't render anything for the title/message/buttons form" 이라는 주석과 함께 `window.confirm()` 웹 폴백이 이미 구현되어 있는데, WriteScreen에는 이 패턴이 적용되어 있지 않습니다.
- 검증: 내용이 없을 때는 `confirmLeave` 없이 바로 `navigation.goBack()`이 호출되어 정상 동작함을 확인했고, 내용이 있을 때만 이 문제가 발생함을 격리해서 확인했습니다.
- 영향: 웹(브라우저) 환경에서 실패담을 쓰다가 취소하려는 사용자는 **글쓰기 화면에 갇혀 버립니다.** (실제 토스 인앱 웹뷰에서도 동일 RN-Web 렌더러를 쓰므로 동일하게 재현될 가능성이 높습니다 — 네이티브 앱(iOS/Android) 빌드에서는 `Alert.alert`가 정상 동작하므로 영향 없음)
- 제안: `SettingsScreen.js`의 `confirmAction` 헬퍼처럼 `Platform.OS === 'web'`일 때 `window.confirm()`으로 분기하는 패턴을 `WriteScreen`의 `confirmLeave`와 `useObserverGuard.js`의 `checkObserverGuard`에도 동일하게 적용 필요.

### 3.2 [심각] 관찰자 모드 가드가 웹에서 완전히 조용히 실패함
- 위치: [useObserverGuard.js](src/hooks/useObserverGuard.js)
- 재현: 관찰자 모드로 둘러보다가 리액션/글쓰기(+)/프로필 아이콘을 클릭하면, "토스로 로그인해 주세요" 안내와 함께 로그인 유도 버튼이 뜨는 것이 의도된 동작이지만, **웹에서는 이 안내창 자체가 전혀 뜨지 않습니다.** 그냥 클릭이 씹히는 것처럼 보입니다.
- 원인: 3.1과 동일하게 `Alert.alert(title, message, [취소, 토스로 로그인])`이 웹에서 무동작.
- 영향: 관찰자가 왜 반응이 없는지 전혀 알 수 없어 "앱이 고장났다"고 오해하기 쉬움. 로그인 유도 도출(전환) 기회도 그대로 날아감.
- 제안: 3.1과 동일한 해결책(web일 때 window.confirm 또는 커스텀 모달로 교체).

### 3.3 [중간] AuthScreen의 친절한 한국어 에러 메시지가 실제로는 절대 쓰이지 않음
- 위치: [AuthScreen.js:22-34](src/screens/AuthScreen.js#L22-L34), 실사용 지점 [AuthScreen.js:241-249](src/screens/AuthScreen.js#L241-L249)
- 현상: `ERROR_MESSAGES` 매핑과 `describeError()` 함수가 "이메일 형식이 올바르지 않습니다" 같은 친절한 문구를 위해 정의되어 있지만, 정작 `DevFallback`의 `catch` 블록은 `describeError(err)`를 호출하지 않고 `err?.message`를 그대로 노출합니다.
- 실측 결과:
  - 잘못된 이메일 입력 시 → `Firebase: Error (auth/invalid-email).` 그대로 노출
  - 6자 미만 비밀번호로 가입 시 → `Firebase: Password should be at least 6 characters (auth/weak-password).` 그대로 노출
- 영향: 세계관에 맞춰 다듬은 한국어 UX 문구가 무색해지고, 개발자용 SDK 에러가 그대로 사용자에게 노출됨.
- 제안: `catch (err) { setError(err?.message ...) }` 부분을 `setError(describeError(err))`로 교체.

### 3.4 [중간] 데스크톱 폭 브라우저에서 헤더 좌측 버튼이 화면 밖으로 밀려남
- 재현: `expo start --web`을 일반 데스크톱 브라우저 창(예: 1280px 폭)에서 열면, Home 화면 본문과 WriteScreen의 헤더 영역이 실제 뷰포트보다 더 넓게 렌더링되며 왼쪽으로 밀립니다. 실측 결과 WriteScreen의 "취소" 텍스트는 `x ≈ -23px` (화면 왼쪽 바깥), "등록"은 `x ≈ 1274~1303px` (1280px 뷰포트의 오른쪽 경계에 걸쳐 대부분 잘림) 위치에 렌더링되어, 마우스로 클릭하기 매우 어렵거나 불가능합니다. Settings/Profile의 "뒤로" 버튼도 동일 현상으로 화면 왼쪽 바깥(x ≈ -10)에 위치하는 것을 확인했습니다.
- 모바일 폭(375px)에서 동일 요소를 재측정한 결과 `취소 x=8`, `등록 x=338` 로 뷰포트(375px) 안에 정상적으로 들어와 있음을 확인 — **이 문제는 넓은(데스크톱) 브라우저 창에서만 재현되며, 실제 토스 인앱 웹뷰(휴대폰 폭)에서는 영향이 없을 가능성이 높습니다.**
- 영향: `expo start --web`으로 데스크톱 브라우저에서 개발/QA 할 때 해당 화면들의 좌측 버튼을 클릭하기 어려움 (개발 경험 저하). 실사용자(토스 앱) 영향은 낮음으로 추정되나, 정확한 원인(어떤 요소가 뷰포트보다 넓게 계산되는지) 규명은 못했으므로 넓은 화면(태블릿 가로모드, 폴더블 등)에서도 재현 여부는 추가 확인 필요.
- 제안: 원인 요소 특정 후 `maxWidth: '100%'` 또는 고정 모바일 컨테이너 폭 적용 검토.

### 3.5 [참고/설계 확인] 관찰자 모드는 항상 하드코딩된 샘플 게시글만 봄
- 위치: [data.js:340-343](src/data.js#L340-L343), [firestore.rules:157](firestore.rules#L157)
- 현상: `firestore.rules`가 `posts` 읽기에 `isAuthenticated()`를 요구하고, 관찰자는 Firebase Auth 로그인을 하지 않으므로(`isObserver() = isObserverMode && !authUser`) 실제 게시글을 구독하지 못합니다. 그 결과 `store.getPosts()`는 항상 `DEFAULT_MUSEUM_POSTS`(하드코딩 3건)로 폴백합니다.
- 실측: 로그인 계정으로는 실제 Firestore의 게시글(3건, "탈락한 소크라테스" 작성)이 보였지만, 관찰자 모드로는 항상 다른 하드코딩 샘플("낙방한 소크라테스" 등)만 보였습니다.
- 판단: 버그라기보다는 규칙과 폴백 로직이 의도대로 맞물린 "설계"로 보이나, **관찰자가 실제 최신 게시글을 전혀 볼 수 없다**는 점은 "학당을 둘러본다"는 관찰자 모드의 취지와는 다소 어긋날 수 있어 참고로 남깁니다. (실제 게시글도 열람만 허용하는 별도 규칙/익명 인증을 고려할 수 있음)

### 3.6 [경미] 이전 화면의 애니메이션이 이동 후에도 계속 실행됨
- 위치: [GraniteNavigator.js:37](src/navigation/GraniteNavigator.js#L37) `detachPreviousScreen: false`
- 현상: 이 옵션 때문에 Home의 파티클 애니메이션(`Animated.loop`, 5개) 등 이전 화면의 무한 루프 애니메이션이 화면을 넘어간 뒤에도 계속 백그라운드에서 실행됩니다. 테스트 중 자동화 도구의 스크린샷 캡처가 지속적으로 타임아웃되는 현상으로 간접 확인했습니다(다른 원인 배제 후 재현).
- 영향: 화면을 깊이 이동할수록(Home→Path→Feed→StoryDetail→...) 누적되는 애니메이션 루프 수가 늘어나 저사양 기기에서 배터리/성능에 영향을 줄 수 있습니다. 전환 애니메이션 품질을 위한 의도적 설정일 수 있으므로 트레이드오프로 판단 필요.

---

## 4. 검증하지 못한 경로 (환경 제약)

- **실제 토스 인앱 로그인(`signInWithToss` → `appLogin()` → Cloud Function `tossLogin`)**: 토스 앱/샌드박스 내부에서만 동작하는 네이티브 브릿지라 브라우저 환경에서는 재현 불가. `detectTossEnvironment()`가 `null`을 반환해 자동으로 개발용 이메일 폴백으로 전환되는 것까지만 확인.
- **Path 화면 숨은 제스처**(하단 문구 2초 롱프레스 → Home으로 복귀): 코드상 `onLongPress`/`delayLongPress={2000}` 확인했으나, 자동화 클릭 도구로 정확한 2초 롱프레스 재현은 하지 않음(코드 리뷰로만 확인).
- **로그아웃 확인창(`window.confirm`) 끝까지 클릭 진행**: `window.confirm()`이 실제 네이티브 브라우저 다이얼로그를 띄우는 것까지는 확인했으나(자동화 클릭이 멈추는 것으로 간접 확인), 다이얼로그 버튼 자체를 스크립트로 누르는 것은 도구 한계로 완료하지 못함. 소스 코드상 로직은 올바른 것으로 판단.
- 네이티브(iOS/Android) 빌드에서의 `Alert.alert` 동작(정상 동작 예상)은 실제 기기로 검증하지 않음.

---

## 5. 데이터 관련 참고사항 (중요)

이번 테스트는 실제 프로덕션 Firebase 프로젝트(`davinchi-7b7cf`)에 연결된 상태로 진행되어, 아래 내용이 실제 Firestore에 남아 있습니다:

- 테스트용 계정 1개 생성: 이메일 `claudetest.qa@academia-atelier-test.internal`, 닉네임은 랜덤 배정된 "낙방한 디오게네스"로 표시됨(가입 시 자동 부여). 소개글을 "QA 자동화 테스트 계정입니다"로 저장함.
- 이 계정으로 StoryDetail(게시글 "이거 뭐에요?")에 방명록 댓글 1건 작성: "QA 테스트 방명록입니다 (자동화 테스트)"
- 기존에 이미 남아있던 것으로 보이는 테스트성 게시글들도 확인됨(이번 테스트로 생성한 것은 아님, 참고용): "이거 뭐에요?", "나 어케해요", "엉엉 힘들어요"(일상), "Gg ducking Ezra"(메이커) — 모두 "탈락한 소크라테스" 계정 작성, 15시간 전.

정리가 필요하시면 Firebase 콘솔(Authentication + Firestore `academia-atelier` DB)에서 위 계정/문서를 삭제해 주세요. (제가 직접 삭제 작업은 진행하지 않았습니다.)

---

## 6. 부수 변경 사항

- `.claude/launch.json`의 `expo-web` 설정에서 하드코딩된 `--port 8082`가 이미 사용 중이던 포트와 충돌해, `autoPort: true`로 변경하고 고정 포트 플래그를 제거했습니다(테스트 진행을 위한 최소 수정). 실제 서버는 8081 포트(Expo 기본값)로 떴습니다.

---

## 7. 우선순위 제안

| 우선순위 | 이슈 | 위치 |
|---|---|---|
| 1 | 글쓰기 취소 시 웹에서 완전히 갇힘 | WriteScreen.js |
| 2 | 관찰자 가드 안내가 웹에서 안 보임 | useObserverGuard.js |
| 3 | 친절한 에러 메시지 매핑이 죽은 코드 | AuthScreen.js |
| 4 | 데스크톱 폭에서 헤더 버튼 화면 밖 이탈 | Home/Write 등 |
| 5 (참고) | 관찰자 모드가 실제 게시글을 못 봄 | data.js / firestore.rules |
