import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStoreState, store } from '../data';
import { colors, fonts, radius } from '../theme';
import ScreenContainer from '../components/ScreenContainer';
import DoroScholar from '../components/DoroScholar';
import { checkObserverGuard } from '../hooks/useObserverGuard';

const REACTIONS = ['👑', '🏺', '🧪', '🕯️'];

// 도슨트(전시 해설사)의 능청스러운 한마디 — 카드 인덱스별 다양하게 노출 (총 30종)
const DOCENT_LINES = [
  '플래시 촬영은 삼가주세요. 실패가 부끄러워합니다.',
  '작품에 손대지 마세요. 실패는 옮을 수 있습니다.',
  '자세히 보아야 웃깁니다. 오래 보아야 짠합니다.',
  '이것은 실패가 아니라 설치미술입니다. 아마도.',
  '관람평은 조용히, 폭소는 마음속으로 부탁드립니다.',
  '본 작품은 작가의 피, 땀, 그리고 흑역사로 제작되었습니다.',
  '실패는 성공의 어머니라지만, 어머니가 너무 많습니다.',
  '도슨트조차 차마 눈을 떼지 못하는 웅장한 흑역사입니다.',
  '이곳의 모든 작품은 100% 실화에 기반하여 재구성되었습니다.',
  '눈물 없이는 볼 수 없고, 웃음 없이는 견딜 수 없는 거작입니다.',
  '완벽한 성공보다 인간미 넘치는 실패가 더 아름다운 법입니다.',
  '지나가시던 소크라테스님도 허허 웃고 가신 실패입니다.',
  '멀리서 보면 희극, 가까이서 보면 대작입니다.',
  '실패의 깊이가 깊을수록 아카데미아의 가치는 올라갑니다.',
  '이 작품 앞에서는 잠시 묵념 대신 헛웃음을 지어주세요.',
  '당시 작가의 심정: "차라리 꿈이었으면 좋겠다."',
  '역사상 가장 아름답게 부서진 계획의 파편입니다.',
  '주의: 관람 중 자신과 유사한 경험을 떠올리고 오열할 수 있습니다.',
  '실패는 죄가 아닙니다. 단지 조금 부끄러울 뿐입니다.',
  '이 방에 들어선 이상, 당신의 실패도 이미 예술입니다.',
  '도슨트 한마디: "저도 작년에 비슷한 짓을 했습니다."',
  '이 정도 실패면 국립현대미술관 특별전 감입니다.',
  '흑역사 청산 불가 판정을 받은 유서 깊은 순간입니다.',
  '작가의 의도: 대성공 / 현실: 영구 소장 명작.',
  '당시 상황을 복기할수록 이불이 찢어질 것 같습니다.',
  '박물관 지정 문화재: "역대급 헛발질의 기록".',
  '실패도 계속되면 예술이 된다는 증거입니다.',
  '작가가 이 글을 쓸 때 손을 떨었다는 소문이 있습니다.',
  '이 작품의 가치는 작가의 민망함과 비례합니다.',
  '다음 생엔 꼭 성공하겠다는 결의가 느껴지는 걸작입니다.',
];

// 전시 배너 부제 — 능청스러운 미술관 문구 (총 20종)
const EXHIBIT_SUBTITLES = [
  '오늘도 성황리에 실패 중',
  '입장료 · 당신의 흑역사 1건',
  '무료 관람 · 위로는 유료',
  '재관람 시 더 짠해집니다',
  '실패의 전당 · 기획 상설전',
  '이불 킥 방지 구역',
  '성공률 0%의 당당한 미학',
  '세계 3대 흑역사 대전시',
  '실패한 자들의 영광스러운 학당',
  '당신의 실패도 조각품이 됩니다',
  '흑역사 연대기 · 명예의 전당',
  '인생은 희극, 실전은 미학',
  '눈물 젖은 소장품 컬렉션',
  '실패자 전용 럭셔리 라운지',
  '완벽주의 치료 구역',
  '흑역사를 팝니다, 영혼을 삽니다',
  '낙방생들의 정기 총회',
  '당당하게 헛발질한 자들의 기록',
  '아카데미아 아틀리에 특별 기획전',
  '실패도 모이면 역사가 된다',
];

// 리액션 총합으로 실패의 '등급'을 능청스럽게 감정
const getGrade = total => {
  if (total >= 90) return { icon: '🏆', label: '국보급 실패' };
  if (total >= 60) return { icon: '💎', label: '보물급 실패' };
  if (total >= 30) return { icon: '✨', label: '유망주 실패' };
  return { icon: '🌱', label: '신진 실패' };
};

// 천 단위 콤마 (Hermes Intl 의존 없이 안전하게)
const formatWon = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const AnimatedReaction = ({ emoji, count, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 12 }).start(() => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
    });
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.reactionItem} activeOpacity={0.7}>
      <Animated.Text style={[styles.reactionEmoji, { transform: [{ scale }] }]}>{emoji}</Animated.Text>
      <Text style={[styles.reactionCount, count > 0 && styles.reactionCountActive]}>{count}</Text>
    </TouchableOpacity>
  );
};

export default function FeedScreen({ navigation }) {
  const getPosts = React.useCallback(() => store.getPosts('daily'), []);
  const posts = useStoreState(getPosts);
  const getCurrentUser = React.useCallback(() => store.getCurrentUser(), []);
  const currentUser = useStoreState(getCurrentUser);

  const [currentIndex, setCurrentIndex] = useState(0);

  // 카드 높이를 헤더/버튼 높이를 빼서 "추정"하면 기기별 세이프에어리어·웹뷰
  // 크롬 차이로 실제 리스트 영역과 어긋나 하단이 잘릴 수 있다 (실사용 중 발견).
  // 대신 리스트를 감싸는 뷰의 onLayout으로 실제 렌더링된 높이를 "측정"해서
  // 그 값을 카드 높이/snapToInterval로 쓴다 — 페이징 스냅은 그대로 유지된다.
  const { height: windowHeight } = useWindowDimensions();
  const HEADER_HEIGHT = 60;
  const safeOffset = Platform.OS === 'ios' ? 44 : 0;
  // onLayout이 아직 안 왔거나(첫 프레임, 혹은 특정 환경에서 안 붙는 경우 대비)
  // 실패했을 때의 폴백. measuredHeight가 잡히면 그 값이 우선한다.
  const estimatedHeight = windowHeight - HEADER_HEIGHT - safeOffset;
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const ITEM_HEIGHT = measuredHeight || estimatedHeight;
  const handleListAreaLayout = e => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== measuredHeight) setMeasuredHeight(h);
  };
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleMomentumEnd = e => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    setCurrentIndex(idx);
  };

  const renderItem = ({ item: post, index }) => {
    const total = REACTIONS.reduce((sum, e) => sum + (post.reactions[e] || 0), 0);
    const grade = getGrade(total);
    const appraisal = total >= 90 ? '값을 매길 수 없음' : `₩ ${formatWon(total * 137000 + 42000)}`;
    const docentLine = DOCENT_LINES[index % DOCENT_LINES.length];
    const exhibitSubtitle = EXHIBIT_SUBTITLES[index % EXHIBIT_SUBTITLES.length];

    const inputRange = [(index - 1) * ITEM_HEIGHT, index * ITEM_HEIGHT, (index + 1) * ITEM_HEIGHT];
    const scale = scrollY.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });
    const opacity = scrollY.interpolate({ inputRange, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });

    return (
      <Animated.View style={[styles.card, { height: ITEM_HEIGHT, opacity, transform: [{ scale }] }]}>
        <LinearGradient
          colors={['#221909', '#161009', '#0F0B07']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardTop}>
          {/* 전시 배너 & 도슨트 학자 */}
          <View style={styles.exhibitBanner}>
            <DoroScholar width={160} height={87} filterScale={7.5} style={{ marginBottom: 4 }} />
            <View style={styles.exhibitOrnamentRow}>
              <View style={styles.exhibitLine} />
              <Text style={styles.exhibitTitle}>실패 미술관 · 상설전</Text>
              <View style={styles.exhibitLine} />
            </View>
            <Text style={styles.exhibitSubtitle}>{exhibitSubtitle}</Text>
          </View>

          {/* 금빛 액자에 걸린 실패작 */}
          <View style={styles.frame}>
            <View style={[styles.frameCorner, styles.frameCornerTL]} />
            <View style={[styles.frameCorner, styles.frameCornerTR]} />
            <View style={[styles.frameCorner, styles.frameCornerBL]} />
            <View style={[styles.frameCorner, styles.frameCornerBR]} />

            <View style={styles.artistRow}>
              <View style={styles.artistAvatar}>
                <Text style={styles.artistAvatarLetter}>{post.authorAvatar}</Text>
              </View>
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{post.authorName}</Text>
                <Text style={styles.artistMeta}>作 · {post.createdAt}</Text>
              </View>
            </View>

            <View style={styles.frameHairline} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('StoryDetail', { id: post.id })}
            >
              <Text style={styles.artworkContent} numberOfLines={5}>
                {post.content}
              </Text>
              <Text style={styles.readMoreLabel}>전체 실패담 더 보기 →</Text>
            </TouchableOpacity>

            {post.tags?.length > 0 && (
              <Text style={styles.tagLine}>{post.tags.map(t => `#${t}`).join('   ')}</Text>
            )}
          </View>

          {/* 작품 도록 라벨 */}
          <Text style={styles.catalogLabel}>
            제 {String(index + 1).padStart(3, '0')}호 소장품
          </Text>

          {/* 감정평가서 — 능청스러운 감정가 */}
          <View style={styles.appraisalCard}>
            <View style={styles.appraisalRow}>
              <Text style={styles.appraisalKey}>등급</Text>
              <Text style={styles.appraisalGrade}>
                {grade.icon} {grade.label}
              </Text>
            </View>
            <View style={styles.appraisalDivider} />
            <View style={styles.appraisalRow}>
              <Text style={styles.appraisalKey}>감정가</Text>
              <Text style={styles.appraisalValue}>{appraisal}</Text>
            </View>
            <Text style={styles.appraisalNote}>* 비매품 · 감정단 오열로 정확도 미보장</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.reactionRow}>
            {REACTIONS.map(emoji => (
              <AnimatedReaction
                key={emoji}
                emoji={emoji}
                count={post.reactions[emoji] || 0}
                onPress={() => checkObserverGuard(navigation, 'react', () => store.reactToPost(post.id, emoji))}
              />
            ))}
          </View>

          <View style={styles.docentRow}>
            <Text style={styles.docentTag}>도슨트</Text>
            <Text style={styles.docentLine}>“{docentLine}”</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <BlurView intensity={40} tint="dark" style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Path')}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle}>아틀리에</Text>
          {posts.length > 0 && (
            <Text style={styles.headerCounter}>
              {currentIndex + 1}번째 전시실 / 전체 {posts.length}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.writeIconButton}
            activeOpacity={0.85}
            onPress={() => {
              checkObserverGuard(navigation, 'write', () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                navigation.navigate('Write', { category: 'daily' });
              });
            }}
          >
            <Text style={styles.writeIconButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={() => checkObserverGuard(navigation, 'profile', () => navigation.navigate('Profile'))}
          >
            <Text style={styles.headerAvatarLetter}>{currentUser.avatar}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.listArea} onLayout={handleListAreaLayout}>
        {posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>전시실이 텅 비었습니다.</Text>
            <Text style={styles.emptySubtext}>미술관 첫 소장품의 주인공이 되어보세요.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Write', { category: 'daily' })}>
              <Text style={styles.emptyButtonText}>실패 출품하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.FlatList
            data={posts}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            pagingEnabled
            snapToInterval={ITEM_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            style={styles.flatList}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            onMomentumScrollEnd={handleMomentumEnd}
            scrollEventThrottle={16}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listArea: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 8,
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
    fontSize: 19,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  headerCounter: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.goldDim,
    letterSpacing: 1,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  writeIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeIconButtonText: {
    fontSize: 16,
    fontFamily: fonts.title,
    color: colors.gold,
    lineHeight: 18,
  },
  profileIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.ember,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarLetter: {
    fontSize: 13,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.title,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: colors.gold,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#1A1208',
    fontFamily: fonts.title,
    fontSize: 14,
  },
  flatList: {
    flex: 1,
  },
  card: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardTop: {},

  // 전시 배너
  exhibitBanner: {
    alignItems: 'center',
    marginBottom: 18,
  },
  exhibitOrnamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exhibitLine: {
    width: 26,
    height: 1,
    backgroundColor: colors.goldDim,
  },
  exhibitTitle: {
    fontFamily: fonts.title,
    fontSize: 12.5,
    color: colors.gold,
    letterSpacing: 2,
  },
  exhibitSubtitle: {
    fontFamily: fonts.bodySerif,
    fontSize: 11.5,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // 금빛 액자
  frame: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(197, 168, 128, 0.04)',
  },
  frameCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: colors.goldBright,
  },
  frameCornerTL: {
    top: 4,
    left: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  frameCornerTR: {
    top: 4,
    right: 4,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  frameCornerBL: {
    bottom: 4,
    left: 4,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  frameCornerBR: {
    bottom: 4,
    right: 4,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ember,
    borderWidth: 1,
    borderColor: colors.gold,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistAvatarLetter: {
    color: colors.textPrimary,
    fontFamily: fonts.title,
    fontSize: 14,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 15,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  artistMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  frameHairline: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: 14,
  },
  artworkContent: {
    fontSize: 15.5,
    lineHeight: 25,
    color: colors.textPrimary,
    fontFamily: fonts.bodySerif,
  },
  readMoreLabel: {
    fontSize: 12,
    fontFamily: fonts.title,
    color: colors.gold,
    marginTop: 6,
  },
  tagLine: {
    fontSize: 12,
    color: colors.goldDim,
    marginTop: 12,
  },

  // 도록 라벨
  catalogLabel: {
    alignSelf: 'center',
    fontFamily: fonts.title,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1,
    marginTop: 14,
  },

  // 감정평가서
  appraisalCard: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceMuted,
  },
  appraisalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appraisalKey: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  appraisalGrade: {
    fontSize: 13.5,
    fontFamily: fonts.title,
    color: colors.goldBright,
  },
  appraisalDivider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: 8,
  },
  appraisalValue: {
    fontSize: 14,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  appraisalNote: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // 하단부
  cardBottom: {},
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -30,
    marginBottom: 14,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  reactionEmoji: {
    fontSize: 19,
  },
  reactionCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  reactionCountActive: {
    color: colors.gold,
    fontFamily: fonts.title,
  },
  docentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  docentTag: {
    fontSize: 10,
    fontFamily: fonts.title,
    color: '#1A1208',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  docentLine: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: fonts.bodySerif,
    fontStyle: 'italic',
  },
});
