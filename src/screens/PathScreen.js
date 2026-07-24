import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, StatusBar, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme';
import ScreenContainer from '../components/ScreenContainer';

import { useStoreState, store } from '../data';
import { LOGIN_COPY } from '../tossAuth';

const Sign = ({ label, icon, rotate, onPress, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      delay,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.signWrap,
        {
          transform: [
            { rotate: `${rotate}deg` },
            {
              scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
            },
          ],
          opacity: anim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onPress();
        }}
        style={styles.signBoard}
      >
        <Text style={styles.signIcon}>{icon}</Text>
        <Text style={styles.signLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function PathScreen({ navigation }) {
  const isObserver = useStoreState(() => store.isObserver());
  // 숨겨진 통로: 하단 문구를 길게 누르면 학칙이 있는 첫 화면으로 되돌아간다.
  const secretGlow = useRef(new Animated.Value(0)).current;

  const enterSecretGate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.timing(secretGlow, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.timing(secretGlow, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start(() => {
      navigation.navigate('Home');
    });
  };

  const footerColor = secretGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textMuted, colors.goldBright],
  });

  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <View style={{ flex: 1 }}>
        <LinearGradient colors={colors.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {isObserver && (
            <TouchableOpacity
              style={styles.observerBanner}
              onPress={() => {
                store.exitObserver();
                navigation.navigate('Auth');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.observerBannerText}>{LOGIN_COPY.observerBanner}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>어느 길로 향하시겠습니까</Text>
            <Text style={styles.subtitle}>두 갈래 흙길이 아카데미아 깊은 곳으로 이어집니다</Text>
          </View>

          <View style={styles.illustration}>
            <View style={styles.pole} />
            <View style={styles.signRow}>
              <Sign
                label="메이커"
                icon="🔨"
                rotate={-6}
                delay={100}
                onPress={() => navigation.navigate('MakerFeed')}
              />
              <Sign
                label="일상"
                icon="🕊️"
                rotate={6}
                delay={280}
                onPress={() => navigation.navigate('Feed')}
              />
            </View>
          </View>

          <Pressable
            onLongPress={enterSecretGate}
            delayLongPress={2000}
            style={({ pressed }) => [styles.footerNoteWrap, pressed && styles.footerNotePressed]}
          >
            <Animated.Text style={[styles.footerNote, { color: footerColor }]}>
              선택한 길은 언제든 다시 되돌아올 수 있습니다.
            </Animated.Text>
          </Pressable>
        </LinearGradient>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  observerBanner: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(197, 168, 128, 0.12)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  observerBannerText: {
    fontSize: 12,
    fontFamily: fonts.title,
    color: colors.goldBright,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: fonts.bodySerif,
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    minHeight: 200,
  },
  pole: {
    position: 'absolute',
    bottom: 26,
    width: 10,
    height: 96,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  signRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 20,
  },
  signWrap: {
    alignItems: 'center',
  },
  signBoard: {
    width: 118,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  signIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  signLabel: {
    fontFamily: fonts.title,
    fontSize: 14.5,
    color: colors.goldBright,
    letterSpacing: 0.5,
  },
  footerNoteWrap: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  footerNotePressed: {
    opacity: 0.6,
  },
  footerNote: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
