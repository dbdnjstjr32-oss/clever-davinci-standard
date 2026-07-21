import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 웹(앱인토스)에서는 SafeAreaView의 시스템 inset 여백이
 * 상/하단 빈 박스로 나타나는 문제가 있어, 웹에서는 일반 View로 대체합니다.
 */
export default function ScreenContainer({ style, children }) {
  if (Platform.OS === 'web') {
    return <View style={[styles.base, style]}>{children}</View>;
  }
  return <SafeAreaView style={[styles.base, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
