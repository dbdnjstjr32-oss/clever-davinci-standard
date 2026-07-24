import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useStoreState, store } from '../data';
import { ANON_LOGIN_ENABLED, LOGIN_COPY } from '../tossAuth';
import { colors, fonts } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ERROR_MESSAGES = {
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/user-not-found': '가입되지 않은 이메일입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
};

// Toss entry failures. Unlike the dev form below we never surface err.message
// here - it carries backend/SDK wording that means nothing to a visitor - so
// every branch maps to copy written for this screen.
const TOSS_ERROR_MESSAGES = {
  // The mini-app runs on an old Toss/SDK build that has no user-key bridge.
  'toss/sdk-outdated': '토스 앱을 업데이트하면 입장할 수 있어요.',
  // Registered under the wrong console category - a setup bug, not a user one.
  'toss/invalid-category': '입장 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
  'toss/unavailable': '토스에서 입장 정보를 받지 못했어요. 잠시 후 다시 시도해 주세요.',
  // Callable-side failures (httpsCallable prefixes its codes with `functions/`).
  'functions/unavailable': '연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
  'functions/deadline-exceeded': '연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
  'functions/unauthenticated':
    '토스 계정 확인에 실패했어요. 토스 앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.',
  'functions/failed-precondition': '입장 기능을 준비하고 있어요.',
  'functions/not-found': '입장 기능을 준비하고 있어요.',
};

function describeError(err) {
  if (err?.code && err.code in ERROR_MESSAGES) return ERROR_MESSAGES[err.code];
  return err?.message || '알 수 없는 오류가 발생했습니다.';
}

function describeAuthError(err) {
  if (err?.code && err.code in TOSS_ERROR_MESSAGES) return TOSS_ERROR_MESSAGES[err.code];
  return '입장하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export default function AuthScreen({ navigation }) {
  const getSignedIn = useCallback(() => store.isSignedIn(), []);
  const signedIn = useStoreState(getSignedIn);

  const [env, setEnv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 1. Spring Bounce Entrance & Gesture Dismiss Animation
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const dismissModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 240,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: false,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  }, [navigation, translateY, backdropOpacity]);

  useEffect(() => {
    // Entrance Spring Bounce Animation! (bounciness: 6, speed: 10.8)
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 6,
        speed: 10.8,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 330,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // 2. Interactive PanResponder for Drag Down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.4) {
          dismissModal();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 6,
            speed: 12.6,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    let mounted = true;
    store.detectTossEnvironment().then(result => {
      if (mounted) setEnv(result || 'web');
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (signedIn) navigation.replace('Path');
  }, [signedIn]);

  // On success we do not navigate here: the `signedIn` effect above is the one
  // and only route into 'Path', so a successful login can't fire two
  // transitions. On failure we show the reason and stay put - a failed login
  // must never silently drop the visitor into observer mode, which is what
  // made the error state below unreachable before. Observer entry stays an
  // explicit choice via the button underneath.
  const handleTossLogin = async () => {
    setBusy(true);
    setError('');
    try {
      await store.signInWithToss();
    } catch (err) {
      console.error('[AuthScreen.js] handleTossLogin:', err);
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleObserverEntry = () => {
    store.enterAsObserver();
    navigation.reset({ index: 0, routes: [{ name: 'Path' }] });
  };

  const inToss = env === 'toss' || env === 'sandbox';

  return (
    <View style={styles.modalRoot}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Dark Backdrop */}
      <TouchableWithoutFeedback onPress={dismissModal}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Bouncy Bottom Sheet Modal */}
      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Drag Handle Top Bar */}
        <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
          <View style={styles.dragHandleBar} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={dismissModal} style={styles.closeHit}>
              <Text style={styles.headerCancelText}>✕ 닫기</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>아카데미아 입학</Text>
            <View style={styles.headerRightPlaceholder} />
          </View>

          <View style={styles.content}>
            <View style={styles.emblemWrap}>
              <View style={styles.emblemCircle}>
                <Text style={styles.emblemIcon}>🏛️</Text>
              </View>
            </View>

            <Text style={styles.title}>{LOGIN_COPY.title}</Text>
            <Text style={styles.subtitle}>{LOGIN_COPY.subtitle}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {env === null ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : inToss && ANON_LOGIN_ENABLED ? (
              <TouchableOpacity
                style={[styles.tossButton, busy && styles.buttonDisabled]}
                onPress={handleTossLogin}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#1A1208" />
                ) : (
                  <Text style={styles.tossButtonText}>{LOGIN_COPY.cta}</Text>
                )}
              </TouchableOpacity>
            ) : !inToss && __DEV__ ? (
              <DevFallback busy={busy} setBusy={setBusy} error={error} setError={setError} />
            ) : (
              // Either inside Toss before the backend exists, or a production
              // web build. Neither can sign anyone in, so the only entry we
              // offer is the observer button rendered below.
              <View style={styles.pendingNotice}>
                <Text style={styles.pendingNoticeText}>{LOGIN_COPY.cta}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.observerButton}
              onPress={handleObserverEntry}
              activeOpacity={0.85}
            >
              <Text style={styles.observerButtonText}>👁️ 관찰자로 학당 둘러보기 (읽기 전용)</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

// Development builds outside Toss only - the caller gates this on `__DEV__`,
// which Metro replaces with the literal `false` in `expo export`, so the form
// and its handlers are dropped from the shipped bundle entirely. That keeps
// the "미니앱에서 로그인 기능은 토스 로그인만 사용할 수 있어요" policy intact
// while `expo start --web` stays testable. There are no credentials here: a
// developer types their own test account.
function DevFallback({ busy, setBusy, error, setError }) {
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'signUp') await store.signUp(email.trim(), password);
      else await store.signIn(email.trim(), password);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.devBadge}>
        <Text style={styles.devBadgeText}>개발 모드 · 토스 앱 밖에서는 이메일로 테스트</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!busy}
      />
      <TouchableOpacity
        style={[styles.tossButton, busy && styles.buttonDisabled]}
        onPress={submit}
        disabled={busy}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color="#1A1208" />
        ) : (
          <Text style={styles.tossButtonText}>
            {mode === 'signIn' ? '입장하기' : '가입하고 입장하기'}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
        disabled={busy}
      >
        <Text style={styles.switchModeText}>
          {mode === 'signIn' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#1C150D',
    borderWidth: 1.5,
    borderColor: colors.gold,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 25,
  },
  dragHandleArea: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
  },
  dragHandleBar: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  closeHit: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    paddingBottom: 24,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerCancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontFamily: fonts.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 32,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  emblemWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emblemCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#2A1505',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemIcon: {
    fontSize: 40,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  errorText: {
    fontSize: 12.5,
    color: colors.ember,
    marginBottom: 14,
    textAlign: 'center',
  },
  tossButton: {
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tossButtonText: {
    fontSize: 15,
    fontFamily: fonts.title,
    color: '#1A1208',
  },
  // Deliberately styled as a flat, unpressable plaque rather than a disabled
  // gold button, so nobody taps it waiting for something to happen.
  pendingNotice: {
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(197, 168, 128, 0.06)',
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingNoticeText: {
    fontSize: 14,
    fontFamily: fonts.title,
    color: colors.textMuted,
  },
  observerButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  observerButtonText: {
    fontSize: 14,
    fontFamily: fonts.title,
    color: colors.gold,
  },
  switchModeButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 13,
    color: colors.gold,
  },
  devBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 16,
  },
  devBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  input: {
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 14,
  },
});
