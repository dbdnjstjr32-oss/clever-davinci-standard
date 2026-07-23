import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStoreState, store } from '../data';
import { colors, fonts, radius } from '../theme';
import ScreenContainer from '../components/ScreenContainer';
import BlacksmithScholar from '../components/BlacksmithScholar';
import ObserverGateCard from '../components/ObserverGateCard';
import { checkObserverGuard } from '../hooks/useObserverGuard';

const OBSERVER_POST_LIMIT = 10;

const REACTIONS = ['👑', '🏺', '🧪', '🕯️'];

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

const FeedCard = ({ post, index, onOpenDetail, onReact }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 6) * 70,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <View style={styles.cornerTL} />
      <View style={styles.cornerBR} />

      <LinearGradient
        colors={['transparent', colors.gold, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccentBar}
      />

      <View style={styles.cardHeader}>
        <View style={styles.cardAvatarCircle}>
          <Text style={styles.cardAvatarLetter}>{post.authorAvatar}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardAuthor}>{post.authorName}</Text>
          <Text style={styles.cardTime}>{post.createdAt}</Text>
        </View>
        <TouchableOpacity style={styles.debateLink} onPress={() => onOpenDetail(post.id)} activeOpacity={0.75}>
          <Text style={styles.debateLinkText}>토론방 →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardContent} numberOfLines={3}>
          {post.content}
        </Text>
        <View style={styles.tagChipRow}>
          {post.tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>#{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.hairlineWrap}>
        <View style={styles.hairline} />
        <Text style={styles.hairlineDot}>◆</Text>
        <View style={styles.hairline} />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.reactionRow}>
          {REACTIONS.map(emoji => (
            <AnimatedReaction
              key={emoji}
              emoji={emoji}
              count={post.reactions[emoji] || 0}
              onPress={() => onReact(post.id, emoji)}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

export default function MakerFeedScreen({ navigation }) {
  const getPosts = React.useCallback(() => store.getPosts('maker'), []);
  const posts = useStoreState(getPosts);
  const getCurrentUser = React.useCallback(() => store.getCurrentUser(), []);
  const currentUser = useStoreState(getCurrentUser);
  const isObserver = useStoreState(() => store.isObserver());

  const visiblePosts = isObserver ? posts.slice(0, OBSERVER_POST_LIMIT) : posts;
  const hasMoreBehindGate = isObserver && posts.length > OBSERVER_POST_LIMIT;

  const renderItem = ({ item: post, index }) => (
    <FeedCard
      post={post}
      index={index}
      onOpenDetail={id => navigation.navigate('StoryDetail', { id })}
      onReact={(id, emoji) =>
        checkObserverGuard(navigation, 'react', () => store.reactToPost(id, emoji))
      }
    />
  );

  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <BlurView intensity={40} tint="dark" style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Path')}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle}>아틀리에</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.writeIconButton}
            activeOpacity={0.85}
            onPress={() => {
              checkObserverGuard(navigation, 'write', () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                navigation.navigate('Write', { category: 'maker' });
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

      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 실패 스토리가 없습니다.</Text>
          <Text style={styles.emptySubtext}>당신의 영광스러운 실패를 자랑해 주세요.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Write', { category: 'maker' })}>
            <Text style={styles.emptyButtonText}>실패 자랑하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visiblePosts}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <BlacksmithScholar width={170} height={117} filterScale={7.5} />
            </View>
          )}
          ListFooterComponent={
            hasMoreBehindGate ? (
              <ObserverGateCard navigation={navigation} remaining={posts.length - OBSERVER_POST_LIMIT} />
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
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
    color: colors.textPrimary,
    letterSpacing: 1,
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
    borderRadius: radius.pill,
  },
  emptyButtonText: {
    color: '#1A1208',
    fontFamily: fonts.title,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cornerTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.gold,
    borderTopLeftRadius: radius.lg,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.gold,
    borderBottomRightRadius: radius.lg,
  },
  cardAccentBar: {
    height: 2,
    marginHorizontal: -18,
    marginTop: -16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.ember,
    borderWidth: 1.5,
    borderColor: colors.gold,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarLetter: {
    color: colors.textPrimary,
    fontFamily: fonts.title,
    fontSize: 15,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardAuthor: {
    fontSize: 15,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  cardTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  debateLink: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  debateLinkText: {
    fontSize: 12,
    color: colors.gold,
    fontFamily: fonts.title,
  },
  cardBody: {
    borderLeftWidth: 2,
    borderLeftColor: colors.hairline,
    paddingLeft: 14,
    marginBottom: 4,
  },
  cardContent: {
    fontSize: 15.5,
    lineHeight: 24,
    color: colors.textPrimary,
    fontFamily: fonts.bodySerif,
    marginBottom: 12,
  },
  tagChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  tagChipText: {
    fontSize: 11.5,
    color: colors.goldDim,
  },
  hairlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  hairline: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  hairlineDot: {
    marginHorizontal: 8,
    fontSize: 9,
    color: colors.goldDim,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 20,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
});
