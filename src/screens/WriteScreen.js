import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenContainer from '../components/ScreenContainer';
import * as Haptics from 'expo-haptics';
import { store } from '../data';
import { colors, fonts } from '../theme';
import { useTossBackGuard } from '../hooks/useTossBackGuard';
import { confirmDialog, infoDialog } from '../utils/alert';

const AVAILABLE_TAGS = ['토론폭망', '변론실패', '증명실패', '오답노트', '일상폭망', '인간관계'];

export default function WriteScreen({ navigation, route }) {
  const category = route?.params?.category ?? 'daily';
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState(['토론폭망']);

  const hasUnsavedChanges = content.trim().length > 0;

  const confirmLeave = useCallback(() => {
    if (hasUnsavedChanges) {
      confirmDialog(
        '작성 취소',
        '작성 중인 내용이 저장되지 않아요. 나가시겠어요?',
        '나가기',
        () => navigation.goBack(),
        { destructive: true }
      );
      return true;
    }
    return false;
  }, [hasUnsavedChanges, navigation]);

  useTossBackGuard(confirmLeave, hasUnsavedChanges);

  const toggleTag = tag => {
    Haptics.selectionAsync().catch(() => {});
    if (selectedTags.includes(tag)) {
      if (selectedTags.length === 1) {
        infoDialog('알림', '최소 하나의 태그는 선택해야 합니다.');
        return;
      }
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    if (!content.trim()) {
      infoDialog('알림', '내용을 입력해 주세요.');
      return;
    }
    store.addPost(content, selectedTags, category);
    navigation.goBack();
  };

  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (hasUnsavedChanges) {
                confirmLeave();
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.headerCancelText}>취소</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>실패 자랑하기</Text>

          <TouchableOpacity onPress={handleSave} disabled={!content.trim()}>
            <Text style={[styles.headerSaveText, content.trim() && styles.headerSaveTextActive]}>
              등록
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>나의 찬란한 실패기</Text>
            <TextInput
              style={styles.textArea}
              placeholder="아테네 학당을 발칵 뒤집어놓은 나만의 기념비적인 실패 스토리를 자랑해 보세요. 동료 학자들의 위로와 경의(이모지)로 실패가 영광의 보석으로 조각됩니다."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.hairline} />

          <View style={styles.tagSection}>
            <Text style={styles.sectionTitle}>실패 태그 선택</Text>
            <Text style={styles.sectionSubtitle}>이 역사적인 실패 유형을 설명해 주세요 (복수 선택 가능).</Text>

            <View style={styles.tagGrid}>
              {AVAILABLE_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity key={tag} onPress={() => toggleTag(tag)} style={styles.tagItem}>
                    <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>#{tag}</Text>
                    {isSelected && <View style={styles.tagUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
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
  headerSaveText: {
    fontSize: 14,
    fontFamily: fonts.title,
    color: colors.textMuted,
  },
  headerSaveTextActive: {
    color: colors.gold,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: fonts.title,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 180,
    fontSize: 16,
    lineHeight: 25,
    color: colors.textPrimary,
    fontFamily: fonts.bodySerif,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.hairline,
    marginBottom: 20,
  },
  tagSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  tagItem: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tagTextActive: {
    fontFamily: fonts.title,
    color: colors.gold,
  },
  tagUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '100%',
    backgroundColor: colors.gold,
    borderRadius: 1,
  },
});

