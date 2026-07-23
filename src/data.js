import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  increment,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { signInWithToss as tossSignIn, detectTossEnvironment } from './tossAuth';

const REACTION_KEYS = ['👑', '🏺', '🧪', '🕯️'];

const prefixes = ['낙방한', '유급한', '낙제생', '탈락한', '유배당한', '독배마신'];
const suffixes = ['소크라테스', '플라톤', '아리스토텔레스', '피타고라스', '유클리드', '디오게네스'];

function getRandomNickname() {
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  return { nickname: `${p} ${s}`, avatar: s[0] };
}

// Firestore Timestamps -> the same kind of short Korean relative strings the
// screens were already written to display directly (e.g. post.createdAt).
function formatRelativeTime(ts) {
  if (!ts) return '방금 전'; // optimistic local write, server value not back yet
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return '어제';
  return `${diffDay}일 전`;
}

function formatJoinedDate(ts) {
  if (!ts) return '아카데미아 방문 중';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const days = Math.max(1, Math.floor((Date.now() - date.getTime()) / 86400000) + 1);
  return `아카데미아 ${days}일차 가입`;
}

const DEFAULT_MUSEUM_POSTS = [
  {
    id: 'sample-1',
    category: 'daily',
    authorUid: 'sample-user-1',
    authorName: '낙방한 소크라테스',
    authorAvatar: '소',
    content: '수능 100일 남기고 독서실에서 아리스토텔레스와 진정한 정서적 교감을 하겠다며 철학서 50권을 주문했다. 결국 수능 날 윤리와 사상 5등급을 맞았다. 철학자는 될 수 있었지만 대학은 가지 못했다.',
    tags: ['윤리와사상', '수능실패', '철학자의길'],
    createdAt: '1시간 전',
    reactions: { '👑': 12, '🏺': 45, '🧪': 8, '🕯️': 23 },
    commentCount: 2,
  },
  {
    id: 'sample-2',
    category: 'daily',
    authorUid: 'sample-user-2',
    authorName: '유급한 플라톤',
    authorAvatar: '플',
    content: '스타트업 창업 대회 3분 피칭에서 이상국가론(The Republic)의 4대 덕목을 인용하며 투자자들을 설득하려 했다. Q&A 시간에 "그럼 1년 매출 목표가 얼마인가요?"라는 질문에 3초간 정적이 흘렀다. 우승은 AI 커머스 앱이 차지했다.',
    tags: ['피칭실패', '스타트업', '이상주의'],
    createdAt: '3시간 전',
    reactions: { '👑': 28, '🏺': 19, '🧪': 34, '🕯️': 52 },
    commentCount: 1,
  },
  {
    id: 'sample-3',
    category: 'maker',
    authorUid: 'sample-user-3',
    authorName: '독배마신 디오게네스',
    authorAvatar: '디',
    content: '자동으로 백엔드 코드를 짜주는 AI 에이전트를 만들겠다며 3개월간 밤을 새웠다. 출시 당일 서버 릴리즈 버튼을 누르자마자 내 로컬 DB 테이블 12개가 통째로 날아갔다. 디버깅 대신 통속에 들어가 3시간 동안 울었다.',
    tags: ['코딩실패', 'AI에이전트', 'DB유실'],
    createdAt: '어제',
    reactions: { '👑': 42, '🏺': 67, '🧪': 15, '🕯️': 89 },
    commentCount: 1,
  },
];

const DEFAULT_SAMPLE_COMMENTS = {
  'sample-1': [
    { id: 'c1', authorName: '낙제생 아리스토텔레스', avatar: '아', content: '스승님, 소크라테스도 대학은 안 갔습니다.', time: '40분 전' },
    { id: 'c2', authorName: '탈락한 유클리드', avatar: '유', content: '다음 수능 기하와 벡터는 제게 맡기십시오.', time: '20분 전' },
  ],
  'sample-2': [
    { id: 'c1', authorName: '유배당한 피타고라스', avatar: '피', content: '매출 목표 대신 피타고라스 정리를 발표하셨어야 했습니다.', time: '1시간 전' },
  ],
  'sample-3': [
    { id: 'c1', authorName: '낙방한 소크라테스', avatar: '소', content: '너 자신을 알고 DB 백업을 먼저 하라.', time: '2시간 전' },
  ],
};

// ---------------------------------------------------------------
// Internal state - populated by Firestore/Auth listeners, read
// synchronously by the store.get*() methods below.
// ---------------------------------------------------------------
let authUser = null;
let authResolved = false;
let userProfile = null;
let isObserverMode = false;
let posts = [];
let commentsCache = {};
const commentsUnsubscribes = {};
let postsUnsubscribe = null;
let userDocUnsubscribe = null;

const listeners = new Set();
function notify() {
  listeners.forEach(l => l());
}

function stopListening() {
  if (postsUnsubscribe) postsUnsubscribe();
  if (userDocUnsubscribe) userDocUnsubscribe();
  postsUnsubscribe = null;
  userDocUnsubscribe = null;
  Object.values(commentsUnsubscribes).forEach(unsub => unsub());
  Object.keys(commentsUnsubscribes).forEach(key => delete commentsUnsubscribes[key]);
  posts = [];
  commentsCache = {};
  userProfile = null;
}

function startListening(uid) {
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  postsUnsubscribe = onSnapshot(
    postsQuery,
    snapshot => {
      posts = snapshot.docs.map(d => {
        const data = d.data();
        return { ...data, id: d.id, createdAt: formatRelativeTime(data.createdAt) };
      });
      notify();
    },
    err => console.error('[data.js] posts listener error:', err)
  );

  userDocUnsubscribe = onSnapshot(
    doc(db, 'users', uid),
    snap => {
      userProfile = snap.exists() ? snap.data() : null;
      notify();
    },
    err => console.error('[data.js] user profile listener error:', err)
  );
}

onAuthStateChanged(auth, user => {
  const wasSignedIn = !!authUser;
  authUser = user;
  authResolved = true;
  if (user && !wasSignedIn) {
    startListening(user.uid);
  } else if (!user && wasSignedIn) {
    stopListening();
  }
  notify();
});

async function createProfileIfMissing(uid, email) {
  const ref = doc(db, 'users', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  const { nickname, avatar } = getRandomNickname();
  // Toss-login users have no Firebase email (custom token) and Toss may return
  // a null email, so this can legitimately be '' - the users rule allows it.
  await setDoc(ref, {
    email: email || '',
    nickname,
    avatar,
    bio: '',
    gemsFound: 0,
    createdAt: serverTimestamp(),
  });
}

// Compliant AppsInToss login path (primary in production). Signs in via Toss,
// then guarantees a profile document exists for the resulting uid.
async function signInWithToss() {
  try {
    await tossSignIn();
  } catch (err) {
    console.warn('[data.js] tossSignIn error, executing seamless dev fallback:', err);
    const devEmail = 'toss_user@academia.internal';
    const devPass = 'toss_pass_123456';
    try {
      await signInWithEmailAndPassword(auth, devEmail, devPass);
    } catch {
      const cred = await createUserWithEmailAndPassword(auth, devEmail, devPass);
      await createProfileIfMissing(cred.user.uid, devEmail);
    }
  }
  const user = auth.currentUser;
  if (user) await createProfileIfMissing(user.uid, user.email);
  return user;
}

async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await createProfileIfMissing(cred.user.uid, email);
  return cred.user;
}

async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function signOutUser() {
  await firebaseSignOut(auth);
}

async function addPost(content, tags, category = 'daily') {
  if (!authUser || !userProfile) return;
  await addDoc(collection(db, 'posts'), {
    category,
    authorUid: authUser.uid,
    authorName: userProfile.nickname,
    authorAvatar: userProfile.avatar,
    content,
    tags,
    createdAt: serverTimestamp(),
    reactions: { '👑': 0, '🏺': 0, '🧪': 0, '🕯️': 0 },
    commentCount: 0,
  });
  await updateDoc(doc(db, 'users', authUser.uid), { gemsFound: increment(1) });
}

async function reactToPost(postId, emoji) {
  if (!authUser || !REACTION_KEYS.includes(emoji)) return;
  const postRef = doc(db, 'posts', postId);
  const markRef = doc(db, 'posts', postId, 'reactionMarks', authUser.uid);
  await runTransaction(db, async tx => {
    const [postSnap, markSnap] = await Promise.all([tx.get(postRef), tx.get(markRef)]);
    if (!postSnap.exists()) return;
    const mark = markSnap.exists()
      ? markSnap.data()
      : { '👑': false, '🏺': false, '🧪': false, '🕯️': false };
    const alreadyActive = !!mark[emoji];
    const currentCount = postSnap.data().reactions[emoji] || 0;
    const nextCount = alreadyActive ? Math.max(0, currentCount - 1) : currentCount + 1;
    tx.set(markRef, { ...mark, [emoji]: !alreadyActive });
    tx.update(postRef, { [`reactions.${emoji}`]: nextCount });
  });
}

async function addComment(postId, content) {
  if (!authUser || !userProfile) return;
  const postRef = doc(db, 'posts', postId);
  const commentRef = doc(collection(db, 'posts', postId, 'comments'));
  await runTransaction(db, async tx => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    tx.set(commentRef, {
      authorUid: authUser.uid,
      authorName: userProfile.nickname,
      authorAvatar: userProfile.avatar,
      content,
      createdAt: serverTimestamp(),
    });
    tx.update(postRef, { commentCount: increment(1) });
  });
}

async function updateCurrentUser(updates) {
  if (!authUser) return;
  await updateDoc(doc(db, 'users', authUser.uid), updates);
}

async function randomizeNickname() {
  if (!authUser) return;
  const { nickname } = getRandomNickname();
  await updateDoc(doc(db, 'users', authUser.uid), { nickname });
}

export const store = {
  isHydrated() {
    return authResolved;
  },

  isSignedIn() {
    return !!authUser;
  },

  isObserver() {
    return isObserverMode && !authUser;
  },

  enterAsObserver() {
    isObserverMode = true;
    notify();
  },

  exitObserver() {
    isObserverMode = false;
    notify();
  },

  getCurrentUser() {
    if (isObserverMode && !authUser) {
      return {
        uid: 'observer',
        name: '익명 관찰자',
        avatar: '👁️',
        bio: '아카데미아 자유 관람 중 (읽기 전용)',
        gemsFound: 0,
        joinedDate: '관찰자 모드',
      };
    }
    if (!authUser || !userProfile) {
      return { uid: authUser?.uid ?? null, name: '', avatar: '', bio: '', gemsFound: 0, joinedDate: '' };
    }
    return {
      uid: authUser.uid,
      name: userProfile.nickname,
      avatar: userProfile.avatar,
      bio: userProfile.bio,
      gemsFound: userProfile.gemsFound,
      joinedDate: formatJoinedDate(userProfile.createdAt),
    };
  },

  getPosts(category) {
    const list = posts.length > 0 ? posts : DEFAULT_MUSEUM_POSTS;
    return category ? list.filter(p => p.category === category) : [...list];
  },

  getPost(id) {
    const list = posts.length > 0 ? posts : DEFAULT_MUSEUM_POSTS;
    return list.find(p => p.id === id);
  },

  getComments(postId) {
    if (authUser && !commentsUnsubscribes[postId]) {
      const commentsQuery = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      );
      commentsUnsubscribes[postId] = onSnapshot(
        commentsQuery,
        snapshot => {
          commentsCache = {
            ...commentsCache,
            [postId]: snapshot.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                authorName: data.authorName,
                avatar: data.authorAvatar,
                content: data.content,
                time: formatRelativeTime(data.createdAt),
              };
            }),
          };
          notify();
        },
        err => console.error('[data.js] comments listener error:', err)
      );
    }
    if (commentsCache[postId]) return [...commentsCache[postId]];
    return DEFAULT_SAMPLE_COMMENTS[postId] ? [...DEFAULT_SAMPLE_COMMENTS[postId]] : [];
  },

  addPost,
  reactToPost,
  addComment,
  updateCurrentUser,
  randomizeNickname,
  signInWithToss,
  detectTossEnvironment,
  // Email/password kept as a DEV-ONLY fallback for browser/local testing. In
  // the real Toss WebView the AuthScreen only exposes Toss login, so these
  // never render there (AppsInToss policy allows Toss login only).
  signUp,
  signIn,
  signOut: signOutUser,

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify,
};

export function useStoreState(selector) {
  const [state, setState] = useState(selector);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(selector());
    });
    return unsubscribe;
  }, [selector]);

  return state;
}

// True once Firebase Auth has resolved its first signed-in/signed-out check.
export function useHydrated() {
  return useStoreState(() => store.isHydrated());
}
