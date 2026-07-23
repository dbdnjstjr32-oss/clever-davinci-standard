import React, { useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from '../components/ScreenContainer';
import ThinkerScholar from '../components/ThinkerScholar';
import { store } from '../data';
import { fonts } from '../theme';
import { useTossBackGuard } from '../hooks/useTossBackGuard';

const RULES = [
  {
    id: '1',
    title: '설립 목적',
    body: '아카데미아 아틀리에는 실패를 부끄러움이 아닌 영광의 원석으로 여기며, 성찰과 기록을 통해 학문적 성장을 도모함을 목적으로 한다.',
  },
  {
    id: '2',
    title: '익명의 원칙',
    body: '모든 학자는 익명의 이름으로 활동하며, 저자보다 그 실패 안에 담긴 깨달음을 우선한다.',
  },
  {
    id: '3',
    title: '기록의 의무',
    body: '발표된 모든 실패는 명판에 새겨져 아카데미아의 영구한 자산이 된다.',
  },
  {
    id: '4',
    title: '경의의 예',
    body: '동료 학자의 실패에는 조롱이 아닌 경의와 위로의 이모지로 답한다.',
  },
  {
    id: '5',
    title: '성찰의 권리',
    body: '누구나 자신의 실패를 성찰하고 걸작으로 승화시킬 권리를 갖는다.',
  },
];

const PARTICLES = [
  { left: 36, size: 5, duration: 5200, delay: 0 },
  { left: 96, size: 3, duration: 4200, delay: 700 },
  { left: 250, size: 4, duration: 6000, delay: 1400 },
  { left: 310, size: 3, duration: 4800, delay: 300 },
  { left: 170, size: 6, duration: 5600, delay: 2000 },
];

const Particle = ({ left, size, duration, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -340] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, size > 4 ? 12 : -12, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
};

export default function HomeScreen({ navigation }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const ruleAnims = useRef(RULES.map(() => new Animated.Value(0))).current;

  // 앱인토스 가이드: 첫 화면에서 뒤로가기 → 미니앱 종료
  useTossBackGuard(
    useCallback(() => {
      BackHandler.exitApp();
      return true;
    }, [])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      120,
      ruleAnims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  const entranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
      },
    ],
  };

  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={['#241A0D', '#120E08', '#1A1410']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {PARTICLES.map((p, i) => (
          <Particle key={i} {...p} />
        ))}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emblemWrap}>
            <Animated.View
              style={[
                styles.emblemGlow,
                { opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            <ThinkerScholar width={160} height={204} filterScale={7.5} />
          </View>

          <Animated.View style={entranceStyle}>
            <Text style={styles.title}>아카데미아{'\n'}아틀리에</Text>
            <Text style={styles.tagline}>실패를 영광의 원석으로{'\n'}조각하는 곳</Text>

            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornamentDot}>◆</Text>
              <View style={styles.ornamentLine} />
            </View>

            <Text style={styles.description}>
              이곳은 낙방과 낙제, 좌절의 기억들이{'\n'}
              부끄러움이 아닌 성찰의 원석으로 다시 빚어지는{'\n'}
              익명의 아카데미아입니다.
            </Text>
          </Animated.View>

          <View style={styles.rulesSection}>
            <Text style={styles.rulesHeader}>아카데미아 학칙</Text>
            <View style={styles.rulesCard}>
              {RULES.map((rule, i) => (
                <Animated.View
                  key={rule.id}
                  style={[
                    styles.ruleRow,
                    i === RULES.length - 1 && styles.ruleRowLast,
                    {
                      opacity: ruleAnims[i],
                      transform: [
                        {
                          translateY: ruleAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [14, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.ruleBadge}>
                    <Text style={styles.ruleBadgeText}>제{rule.id}조</Text>
                  </View>
                  <View style={styles.ruleTextWrap}>
                    <Text style={styles.ruleTitle}>{rule.title}</Text>
                    <Text style={styles.ruleBody}>{rule.body}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButtonInScroll}
            activeOpacity={0.85}
            onPress={() => navigation.navigate((store.isSignedIn() || store.isObserver()) ? 'Path' : 'Auth')}
          >
            <LinearGradient
              colors={['#E8D5A8', '#C5A880', '#A8875A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>입학하기</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            아카데미아의 문은 실패한 모든 이에게 열려 있습니다.
          </Text>
        </ScrollView>
      </LinearGradient>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1410',
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  particle: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#C5A880',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginBottom: 12,
  },
  emblemGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#C5A880',
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 12,
  },
  emblemCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#2A1505',
    borderWidth: 2,
    borderColor: '#C5A880',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  emblemIcon: {
    fontSize: 52,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: '#F0E6C8',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 1,
    textShadowColor: '#C5A88088',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontFamily: fonts.bodySerif,
    fontSize: 16,
    color: '#C5A880',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 22,
    gap: 12,
  },
  ornamentLine: {
    width: 50,
    height: 1,
    backgroundColor: '#4A3820',
  },
  ornamentDot: {
    color: '#C5A880',
    fontSize: 10,
  },
  description: {
    fontSize: 13.5,
    color: '#A09080',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  rulesSection: {
    marginBottom: 8,
  },
  rulesHeader: {
    fontFamily: fonts.title,
    fontSize: 17,
    color: '#F0E6C8',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 14,
  },
  rulesCard: {
    backgroundColor: '#1E180F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3D2E1A',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A1F0F',
  },
  ruleRowLast: {
    borderBottomWidth: 0,
  },
  ruleBadge: {
    minWidth: 52,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#2A1F0F',
    borderWidth: 1,
    borderColor: '#4A3820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBadgeText: {
    fontFamily: fonts.title,
    fontSize: 13,
    color: '#C5A880',
  },
  ruleTextWrap: {
    flex: 1,
  },
  ruleTitle: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: '#F0E6C8',
    marginBottom: 4,
  },
  ruleBody: {
    fontSize: 12.5,
    color: '#8A7A5A',
    lineHeight: 18,
  },
  ctaButtonInScroll: {
    width: '100%',
    marginTop: 28,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  ctaGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A1208',
    letterSpacing: 1,
  },
  ctaArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1208',
  },
  footerNote: {
    marginTop: 18,
    fontSize: 11,
    color: '#5A4A30',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
