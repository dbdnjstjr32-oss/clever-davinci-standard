#!/usr/bin/env node
/**
 * 관찰자 전용 하드코딩 샘플(src/data.js의 DEFAULT_MUSEUM_POSTS/DEFAULT_SAMPLE_COMMENTS)에만
 * 있던 신규 게시글 60개를 실제 로그인 피드(Firestore)에도 똑같이 채워 넣는다.
 *
 * 보안 규칙(firestore.rules) 제약 때문에 관리자 권한 없이는:
 *   - reactions는 계정당 이모지 하나에 1만 기여 가능 (reactionMarks 1인1표 구조)
 *   - commentCount/createdAt은 서버 트랜잭션으로만 올릴 수 있음 (request.time 강제)
 * 이라서, 기존 QA 테스트 계정으로 실제 글쓰기 -> 4개 이모지 전부 공감 -> 댓글 작성을
 * 그대로 재현한다. 표시되는 작성자/댓글 이름은 게시글마다 다르게 넣어도 규칙 위반이
 * 아니다 (authorUid만 request.auth.uid와 같으면 됨).
 *
 * 실행: node scripts/seed-firestore.mjs
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: 'AIzaSyAx81cRKAeqScS37QGSf6o97yabTO_LSpk',
  authDomain: 'davinchi-7b7cf.firebaseapp.com',
  projectId: 'davinchi-7b7cf',
  storageBucket: 'davinchi-7b7cf.firebasestorage.app',
  messagingSenderId: '995517351440',
  appId: '1:995517351440:web:dbb8e9bd6edb06eb762c95',
};

const TEST_EMAIL = 'claudetest.qa@academia-atelier-test.internal';
const TEST_PASSWORD = 'claudeTest123!';
const REACTION_KEYS = ['👑', '🏺', '🧪', '🕯️'];

function extractBetween(src, startMarker, endMarker, fromIndex = 0) {
  const start = src.indexOf(startMarker, fromIndex);
  if (start === -1) throw new Error(`marker not found: ${startMarker}`);
  const bodyStart = start + startMarker.length;
  const end = src.indexOf(endMarker, bodyStart);
  if (end === -1) throw new Error(`end marker not found: ${endMarker}`);
  return { body: src.slice(bodyStart, end), nextIndex: end };
}

function loadSeedData() {
  const dataJsPath = path.join(__dirname, '..', 'src', 'data.js');
  const src = fs.readFileSync(dataJsPath, 'utf8');

  const { body: postsBody } = extractBetween(
    src,
    'const DEFAULT_MUSEUM_POSTS = [',
    '\n];\n\nconst DEFAULT_SAMPLE_COMMENTS'
  );
  const allPosts = new Function(`return [${postsBody}]`)();

  const { body: commentsBody } = extractBetween(
    src,
    'const DEFAULT_SAMPLE_COMMENTS = {',
    "\n};\n\n// ---------------------------------------------------------------\n// Internal state"
  );
  const allComments = new Function(`return {${commentsBody}}`)();

  // Only the 60 posts added this session (sample-4..sample-63) - sample-1..3
  // already existed before and aren't part of "임의로 추가한" batch.
  const newPosts = allPosts.filter(p => {
    const n = parseInt(p.id.replace('sample-', ''), 10);
    return n >= 4;
  });
  return { posts: newPosts, comments: allComments };
}

async function reactOnce(db, uid, postId, emoji) {
  const postRef = doc(db, 'posts', postId);
  const markRef = doc(db, 'posts', postId, 'reactionMarks', uid);
  await runTransaction(db, async tx => {
    const [postSnap, markSnap] = await Promise.all([tx.get(postRef), tx.get(markRef)]);
    if (!postSnap.exists()) return;
    const mark = markSnap.exists()
      ? markSnap.data()
      : { '👑': false, '🏺': false, '🧪': false, '🕯️': false };
    if (mark[emoji]) return;
    const current = postSnap.data().reactions[emoji] || 0;
    tx.set(markRef, { ...mark, [emoji]: true });
    tx.update(postRef, { [`reactions.${emoji}`]: current + 1 });
  });
}

async function addCommentAs(db, uid, postId, authorName, avatar, content) {
  const postRef = doc(db, 'posts', postId);
  const commentRef = doc(collection(db, 'posts', postId, 'comments'));
  await runTransaction(db, async tx => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    tx.set(commentRef, {
      authorUid: uid,
      authorName,
      authorAvatar: avatar,
      content,
      createdAt: serverTimestamp(),
    });
    tx.update(postRef, { commentCount: increment(1) });
  });
}

async function main() {
  const { posts, comments } = loadSeedData();
  console.log(`Loaded ${posts.length} posts to seed.`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app, 'academia-atelier');

  await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  const uid = auth.currentUser.uid;
  console.log('Signed in as', uid);

  let done = 0;
  for (const post of posts) {
    const postRef = await addDoc(collection(db, 'posts'), {
      category: post.category,
      authorUid: uid,
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      content: post.content,
      tags: post.tags,
      createdAt: serverTimestamp(),
      reactions: { '👑': 0, '🏺': 0, '🧪': 0, '🕯️': 0 },
      commentCount: 0,
    });

    for (const emoji of REACTION_KEYS) {
      if ((post.reactions[emoji] || 0) > 0) {
        await reactOnce(db, uid, postRef.id, emoji);
      }
    }

    const postComments = comments[post.id] || [];
    for (const c of postComments) {
      await addCommentAs(db, uid, postRef.id, c.authorName, c.avatar, c.content);
    }

    done += 1;
    console.log(`[${done}/${posts.length}] ${post.id} -> ${postRef.id} (${postComments.length} comments)`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
