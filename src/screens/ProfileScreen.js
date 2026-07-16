import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoreState, store } from '../data';
import { colors, fonts } from '../theme';

export default function ProfileScreen({ navigation }) {
  const getCurrentUser = useCallback(() => store.getCurrentUser(), []);
  const currentUser = useStoreState(getCurrentUser);
  const getPosts = useCallback(() => store.getPosts(), []);
  const posts = useStoreState(getPosts);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState(currentUser.bio);

  const userPosts = posts.filter(post => !post.seed);

  const handleSaveBio = () => {
    if (!newBio.trim()) {
      Alert.alert('알림', '소개글을 입력해 주세요.');
      return;
    }
    store.updateCurrentUser({ bio: newBio });
    setIsEditingBio(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsButtonText}>설정</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{currentUser.avatar}</Text>
          </View>

          <Text style={styles.userName}>{currentUser.name}</Text>
          <Text style={styles.authBadgeText}>익명의 학자</Text>
          <Text style={styles.joinDate}>{currentUser.joinedDate}</Text>

          <View style={styles.bioContainer}>
            {isEditingBio ? (
              <View style={styles.editBioRow}>
                <TextInput
                  value={newBio}
                  onChangeText={setNewBio}
                  placeholder="자기소개를 적어주세요."
                  placeholderTextColor={colors.textMuted}
                  style={styles.bioInput}
                />
                <View style={styles.editBioButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setNewBio(currentUser.bio);
                      setIsEditingBio(false);
                    }}
                  >
                    <Text style={styles.bioBtnTextCancel}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveBio}>
                    <Text style={styles.bioBtnTextSave}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setIsEditingBio(true)}>
                <Text style={styles.bioText}>{currentUser.bio}</Text>
                <Text style={styles.editLabel}>소개글 수정하기</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hairline} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>발견한 원석</Text>
              <Text style={styles.statValue}>{currentUser.gemsFound}개</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>작성한 스토리</Text>
              <Text style={styles.statValue}>{userPosts.length}개</Text>
            </View>
          </View>
        </View>

        <View style={styles.hairline} />

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>내가 기록한 원석들</Text>

          {userPosts.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>아직 등록한 스토리가 없습니다.</Text>
            </View>
          ) : (
            userPosts.map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.listRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('StoryDetail', { id: post.id })}
              >
                <View style={styles.listRowContents}>
                  <Text style={styles.listRowTextMain} numberOfLines={1}>
                    {post.content}
                  </Text>
                  <Text style={styles.listRowTags}>
                    {post.tags.map(t => `#${t}`).join('   ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  settingsButtonText: {
    fontSize: 14,
    color: colors.gold,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.ember,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarLetter: {
    fontSize: 30,
    fontFamily: fonts.title,
    color: colors.textPrimary,
  },
  userName: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  authBadgeText: {
    color: colors.gold,
    fontSize: 12.5,
    marginBottom: 6,
  },
  joinDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 18,
  },
  bioContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fonts.bodySerif,
  },
  editLabel: {
    fontSize: 12,
    color: colors.gold,
    textAlign: 'center',
  },
  editBioRow: {
    width: '100%',
    gap: 10,
  },
  bioInput: {
    width: '100%',
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  editBioButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  bioBtnTextCancel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  bioBtnTextSave: {
    fontSize: 13,
    fontFamily: fonts.title,
    color: colors.gold,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: 22,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.gold,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.hairline,
  },
  listSection: {},
  listTitle: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyListText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: 12,
  },
  listRowContents: {
    flex: 1,
  },
  listRowTextMain: {
    fontSize: 14,
    fontFamily: fonts.title,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  listRowTags: {
    fontSize: 11.5,
    color: colors.goldDim,
  },
});
