import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStoreState, store } from '../data';
import { colors, fonts } from '../theme';
import appJson from '../../app.json';

const SettingsRow = ({ label, value, onPress, danger }) => (
  <TouchableOpacity
    style={styles.row}
    activeOpacity={0.7}
    onPress={() => {
      Haptics.selectionAsync().catch(() => {});
      onPress();
    }}
  >
    <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
    <View style={styles.rowRight}>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Text style={styles.rowArrow}>›</Text>
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const getCurrentUser = useCallback(() => store.getCurrentUser(), []);
  const currentUser = useStoreState(getCurrentUser);

  const handleRandomizeNickname = () => {
    Alert.alert('닉네임 변경', '새로운 익명 닉네임을 받으시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '변경',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          store.randomizeNickname();
        },
      },
    ]);
  };

  const handleResetData = () => {
    Alert.alert(
      '전체 데이터 초기화',
      '작성한 스토리, 댓글, 소개글이 모두 초기 상태로 되돌아갑니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            store.resetAllData();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>계정</Text>
        <View style={styles.card}>
          <SettingsRow label="닉네임 변경" value={currentUser.name} onPress={handleRandomizeNickname} />
        </View>

        <Text style={styles.sectionLabel}>데이터</Text>
        <View style={styles.card}>
          <SettingsRow label="전체 데이터 초기화" onPress={handleResetData} danger />
        </View>

        <Text style={styles.sectionLabel}>정보</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>앱 이름</Text>
            <Text style={styles.rowValue}>아카데미아 아틀리에</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>버전</Text>
            <Text style={styles.rowValue}>{appJson.expo.version}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
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
  backButtonText: {
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 14.5,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  rowLabelDanger: {
    color: colors.ember,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  rowArrow: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
