import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { store } from '../data';
import { LOGIN_COPY } from '../tossAuth';

/**
 * 관찰자 모드에서 목록 앞부분(10개)만 보여준 뒤 노출하는 로그인 유도 카드.
 */
export default function ObserverGateCard({ navigation, remaining, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>{LOGIN_COPY.gateTitle}</Text>
      <Text style={styles.subtitle}>
        {LOGIN_COPY.gateSubtitle}{'\n'}
        {remaining > 0 ? `이야기 ${remaining}편을 더 ` : ''}만나볼 수 있어요
      </Text>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={() => {
          store.exitObserver();
          navigation.navigate('Auth');
        }}
      >
        <LinearGradient
          colors={['#E8D5A8', '#C5A880', '#A8875A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>{LOGIN_COPY.gateCta}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 44,
  },
  icon: {
    fontSize: 38,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 26,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A1208',
    letterSpacing: 0.5,
  },
});
