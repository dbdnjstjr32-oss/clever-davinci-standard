import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStoreState, store } from '../data';
import { colors, fonts, radius } from '../theme';
import ScreenContainer from '../components/ScreenContainer';

const REACTIONS = [
  { emoji: '👑', label: '왕관' },
  { emoji: '🏺', label: '헌정' },
  { emoji: '🧪', label: '탐구' },
  { emoji: '🕯️', label: '위로' },
];

// 게시글 id로부터 안정적인 소장번호 생성
const accessionOf = id => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(h % 10000).padStart(4, '0');
};

const Ornament = () => (
  <View style={styles.ornamentRow}>
    <View style={styles.ornamentLine} />
    <Text style={styles.ornamentDot}>◆</Text>
    <View style={styles.ornamentLine} />
  </View>
);

const GuestbookEntry = ({ comment, index }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 5) * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.entry,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <View style={styles.entrySeal}>
        <Text style={styles.entrySealText}>{comment.avatar || '訪'}</Text>
      </View>
      <View style={styles.entryBody}>
        <View style={styles.entryMeta}>
          <Text style={styles.entryAuthor}>{comment.authorName}</Text>
          <Text style={styles.entryTime}>{comment.time}</Text>
        </View>
        <Text style={styles.entryText}>{comment.content}</Text>
      </View>
    </Animated.View>
  );
};

export default function StoryDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const getPost = useCallback(() => store.getPost(id), [id]);
  const post = useStoreState(getPost);
  const getComments = useCallback(() => store.getComments(id), [id]);
  const comments = useStoreState(getComments);

  const [commentText, setCommentText] = useState('');

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>전시실을 찾을 수 없습니다.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    store.addComment(id, commentText.trim());
    setCommentText('');
  };

  const accession = accessionOf(id);

  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 전시실 조명(스포트라이트) 워시 */}
        <LinearGradient
          colors={['rgba(197, 168, 128, 0.14)', 'rgba(197, 168, 128, 0.03)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.spotlight}
          pointerEvents="none"
        />

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backHit} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerTitleWrap} pointerEvents="none">
              <Text style={styles.headerTitle}>헌정 전시실</Text>
              <Text style={styles.headerSub}>단 하나의 실패를 위한 방</Text>
            </View>
            <View style={styles.headerRightPlaceholder} />
          </View>

          <View style={styles.mainContent}>
            {/* 작가 명패 */}
            <View style={styles.artistPedestal}>
              <View style={styles.artistAvatar}>
                <Text style={styles.artistAvatarLetter}>{post.authorAvatar}</Text>
              </View>
              <Text style={styles.artistName}>{post.authorName}</Text>
              <Text style={styles.artistRole}>作家 · 이 실패의 창작자</Text>
            </View>

            {/* 작품(실패담) — 대형 인용부호로 감싼 전시 */}
            <View style={styles.artworkWrap}>
              <Text style={styles.quoteMark}>❝</Text>
              <Text style={styles.artworkText}>{post.content}</Text>
              <Text style={[styles.quoteMark, styles.quoteMarkClose]}>❞</Text>
            </View>

            {/* 브라스 명판 */}
            <View style={styles.plaque}>
              <View style={styles.plaqueInner}>
                <Text style={styles.plaqueAccession}>소장번호 · No. {accession}</Text>
                <View style={styles.plaqueRule} />
                <View style={styles.plaqueSpecRow}>
                  <Text style={styles.plaqueSpecKey}>작가</Text>
                  <Text style={styles.plaqueSpecVal}>{post.authorName}</Text>
                </View>
                <View style={styles.plaqueSpecRow}>
                  <Text style={styles.plaqueSpecKey}>재료</Text>
                  <Text style={styles.plaqueSpecVal}>실패 · 혼합재료</Text>
                </View>
                <View style={styles.plaqueSpecRow}>
                  <Text style={styles.plaqueSpecKey}>분류</Text>
                  <Text style={styles.plaqueSpecVal}>{post.tags.map(t => `#${t}`).join('  ')}</Text>
                </View>
                <View style={styles.plaqueSpecRow}>
                  <Text style={styles.plaqueSpecKey}>소장</Text>
                  <Text style={styles.plaqueSpecVal}>{post.createdAt}</Text>
                </View>
              </View>
            </View>

            <Ornament />

            {/* 경의 헌정 */}
            <View style={styles.tributeSection}>
              <Text style={styles.sectionLabel}>이 실패에 경의를 표하기</Text>
              <View style={styles.reactionRow}>
                {REACTIONS.map(({ emoji, label }) => {
                  const count = post.reactions[emoji] || 0;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        store.reactToPost(post.id, emoji);
                      }}
                      style={styles.reactionItem}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      <Text style={[styles.reactionCount, count > 0 && styles.reactionCountActive]}>
                        {count}
                      </Text>
                      <Text style={styles.reactionLabel}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Ornament />

            {/* 관람객 방명록 */}
            <View style={styles.guestbookSection}>
              <Text style={styles.sectionLabel}>관람객 방명록 · {comments.length}</Text>
              {comments.length === 0 ? (
                <View style={styles.emptyGuestbook}>
                  <Text style={styles.emptyGuestbookText}>
                    아직 방명록이 비어 있습니다.{'\n'}이 실패에 첫 경의를 남겨보세요.
                  </Text>
                </View>
              ) : (
                <View style={styles.guestbookList}>
                  {comments.map((comment, i) => (
                    <GuestbookEntry key={comment.id} comment={comment} index={i} />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            placeholder="방명록에 경의를 남겨주세요"
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            style={styles.inputField}
          />
          <TouchableOpacity
            style={[styles.sendButton, commentText.trim() && styles.sendButtonActive]}
            onPress={handleAddComment}
            disabled={!commentText.trim()}
          >
            <Text style={[styles.sendButtonText, commentText.trim() && styles.sendButtonTextActive]}>
              남기기
            </Text>
          </TouchableOpacity>
        </View>
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
  spotlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },

  // 헤더
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backHit: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 10,
    color: colors.goldDim,
    letterSpacing: 1,
    marginTop: -10,
  },
  headerRightPlaceholder: {
    width: 40,
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mainContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // 작가 명패
  artistPedestal: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 26,
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ember,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  artistAvatarLetter: {
    color: colors.textPrimary,
    fontFamily: fonts.title,
    fontSize: 22,
  },
  artistName: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  artistRole: {
    fontSize: 11.5,
    color: colors.goldDim,
    letterSpacing: 0.5,
    marginTop: 5,
  },

  // 작품
  artworkWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  quoteMark: {
    fontSize: 34,
    lineHeight: 34,
    color: colors.gold,
    opacity: 0.55,
  },
  quoteMarkClose: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  artworkText: {
    fontSize: 17,
    lineHeight: 29,
    color: colors.textPrimary,
    fontFamily: fonts.bodySerif,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },

  // 브라스 명판
  plaque: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'rgba(197, 168, 128, 0.06)',
    padding: 5,
  },
  plaqueInner: {
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.35)',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  plaqueAccession: {
    fontFamily: fonts.plaque,
    fontSize: 12,
    color: colors.goldBright,
    letterSpacing: 2,
    textAlign: 'center',
  },
  plaqueRule: {
    height: 1,
    backgroundColor: 'rgba(197, 168, 128, 0.3)',
    marginVertical: 12,
  },
  plaqueSpecRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  plaqueSpecKey: {
    width: 44,
    fontSize: 12,
    fontFamily: fonts.title,
    color: colors.goldDim,
    letterSpacing: 3,
  },
  plaqueSpecVal: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.plaque,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // 장식
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 26,
  },
  ornamentLine: {
    width: 48,
    height: 1,
    backgroundColor: colors.border,
  },
  ornamentDot: {
    color: colors.goldDim,
    fontSize: 10,
  },

  // 경의 헌정
  tributeSection: {
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: fonts.title,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 18,
    textAlign: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  reactionItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceMuted,
    minWidth: 66,
  },
  reactionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  reactionCount: {
    fontSize: 15,
    fontFamily: fonts.title,
    color: colors.textMuted,
  },
  reactionCountActive: {
    color: colors.goldBright,
  },
  reactionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    letterSpacing: 0.5,
  },

  // 방명록
  guestbookSection: {},
  emptyGuestbook: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyGuestbookText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fonts.bodySerif,
    fontStyle: 'italic',
  },
  guestbookList: {
    gap: 16,
  },
  entry: {
    flexDirection: 'row',
    gap: 12,
  },
  entrySeal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.goldDim,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySealText: {
    fontFamily: fonts.title,
    fontSize: 13,
    color: colors.gold,
  },
  entryBody: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    paddingBottom: 14,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 5,
  },
  entryAuthor: {
    fontSize: 13.5,
    fontFamily: fonts.title,
    color: colors.textSecondary,
  },
  entryTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  entryText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
    fontFamily: fonts.bodySerif,
  },

  // 입력 바
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.surfaceMuted,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  sendButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  sendButtonText: {
    fontSize: 13.5,
    fontFamily: fonts.title,
    color: colors.textMuted,
  },
  sendButtonTextActive: {
    color: '#1A1208',
  },

  // 에러
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  errorButton: {
    marginTop: 20,
    backgroundColor: colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  errorButtonText: {
    color: '#1A1208',
    fontFamily: fonts.title,
  },
});
