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
  {
    id: 'sample-4',
    category: 'daily',
    authorUid: 'sample-user-4',
    authorName: '낙제생 피타고라스',
    authorAvatar: '피',
    content: '소개팅 자기소개란에 "저는 계획이 다 있습니다"라고 당당히 썼다. 정작 당일엔 우산도 안 챙기고 나가 비를 쫄딱 맞은 채 카페에 들어섰고, 상대는 이미 자리에서 일어나고 있었다.',
    tags: ['소개팅실패', '인간관계', '우천취소'],
    createdAt: '8분 전',
    reactions: { '👑': 3, '🏺': 7, '🧪': 2, '🕯️': 11 },
    commentCount: 1,
  },
  {
    id: 'sample-5',
    category: 'daily',
    authorUid: 'sample-user-5',
    authorName: '유배당한 아리스토텔레스',
    authorAvatar: '아',
    content: '새해 다짐으로 1년치 PT를 끊으며 "이번엔 다르다"고 선언했다. 3개월이 지난 지금 출석 횟수는 3회, 트레이너님은 이제 내 이름 대신 "그분 오셨어요?"라고 묻는다.',
    tags: ['헬스장실패', '작심삼일', '자기관리'],
    createdAt: '방금 전',
    reactions: { '👑': 12, '🏺': 18, '🧪': 5, '🕯️': 20 },
    commentCount: 2,
  },
  {
    id: 'sample-6',
    category: 'daily',
    authorUid: 'sample-user-6',
    authorName: '탈락한 플라톤',
    authorAvatar: '플',
    content: '다이어트 어플을 구독하며 식단관리를 시작했다. 앱을 마지막으로 연 날짜를 확인해보니 정확히 구독 결제 다음 날이었다.',
    tags: ['다이어트실패', '작심삼일', '구독료헌납'],
    createdAt: '15분 전',
    reactions: { '👑': 2, '🏺': 9, '🧪': 3, '🕯️': 14 },
    commentCount: 0,
  },
  {
    id: 'sample-7',
    category: 'daily',
    authorUid: 'sample-user-7',
    authorName: '독배마신 유클리드',
    authorAvatar: '유',
    content: '친구 뒷담화를 "나만 보는 채팅방"에 쓴다는 게 실수로 8명이 있는 단체 카톡방에 전송해버렸다. 3초 만에 지웠지만 "메시지 삭제됨" 알림이 더 큰 증거가 되었다.',
    tags: ['카톡대참사', '인간관계', '손절위기'],
    createdAt: '22분 전',
    reactions: { '👑': 31, '🏺': 24, '🧪': 9, '🕯️': 42 },
    commentCount: 2,
  },
  {
    id: 'sample-8',
    category: 'daily',
    authorUid: 'sample-user-8',
    authorName: '낙방한 디오게네스',
    authorAvatar: '디',
    content: '이직 최종 면접용 PPT를 밤새 준비하며 회사 이름을 정성껏 넣었다. 발표 당일 그 이름이 이전 지원했던 다른 회사 이름이라는 걸 3번째 슬라이드에서야 깨달았다.',
    tags: ['면접실패', '이직', '오타사고'],
    createdAt: '35분 전',
    reactions: { '👑': 8, '🏺': 15, '🧪': 6, '🕯️': 19 },
    commentCount: 1,
  },
  {
    id: 'sample-9',
    category: 'daily',
    authorUid: 'sample-user-9',
    authorName: '유급한 소크라테스',
    authorAvatar: '소',
    content: '소개팅 3번째 만남에서 상대 이름을 확신에 차서 불렀는데, 전전 소개팅 상대 이름이었다. 정적이 3초, 그리고 계산은 내가 했다.',
    tags: ['소개팅실패', '인간관계', '이름사고'],
    createdAt: '48분 전',
    reactions: { '👑': 5, '🏺': 11, '🧪': 4, '🕯️': 16 },
    commentCount: 1,
  },
  {
    id: 'sample-10',
    category: 'daily',
    authorUid: 'sample-user-10',
    authorName: '낙제생 아리스토텔레스',
    authorAvatar: '아',
    content: '부모님 앞에서 강아지가 얼마나 똑똑한지 자랑하려 "앉아"를 시켰다. 강아지는 정확히 반대로 일어나 소파 위로 뛰어올라 부모님이 아끼는 쿠션을 물어뜯었다.',
    tags: ['반려동물', '가족모임', '기대와현실'],
    createdAt: '1시간 전',
    reactions: { '👑': 14, '🏺': 20, '🧪': 7, '🕯️': 25 },
    commentCount: 1,
  },
  {
    id: 'sample-11',
    category: 'daily',
    authorUid: 'sample-user-11',
    authorName: '탈락한 유클리드',
    authorAvatar: '유',
    content: '이사 견적을 가장 싼 곳으로 대충 잡았다. 이사 당일 트럭이 오지 않았고, 사장님 번호는 결번이 되어 있었다.',
    tags: ['이사실패', '사기주의', '현타'],
    createdAt: '1시간 전',
    reactions: { '👑': 9, '🏺': 13, '🧪': 5, '🕯️': 22 },
    commentCount: 1,
  },
  {
    id: 'sample-12',
    category: 'daily',
    authorUid: 'sample-user-12',
    authorName: '독배마신 플라톤',
    authorAvatar: '플',
    content: '카페에서 진동벨 대신 이름을 불러주는 시스템이었는데, 직원이 내 이름을 잘못 듣고 완전히 다른 사람 이름을 외쳤다. 나는 그냥 손을 들었고, 그렇게 나는 그 카페에서 "민준님"이 되었다.',
    tags: ['카페실화', '민망', '생활폭망'],
    createdAt: '2시간 전',
    reactions: { '👑': 4, '🏺': 10, '🧪': 3, '🕯️': 15 },
    commentCount: 0,
  },
  {
    id: 'sample-13',
    category: 'daily',
    authorUid: 'sample-user-13',
    authorName: '유배당한 피타고라스',
    authorAvatar: '피',
    content: '노래방에서 고음 파트를 자신 있게 시도했다. 목소리는 갈라졌고, 그 후 3일간 목소리가 완전히 잠겨 회사에서 필담으로 업무를 봐야 했다.',
    tags: ['노래방참사', '목상함', '후유증'],
    createdAt: '2시간 전',
    reactions: { '👑': 6, '🏺': 16, '🧪': 8, '🕯️': 20 },
    commentCount: 1,
  },
  {
    id: 'sample-14',
    category: 'daily',
    authorUid: 'sample-user-14',
    authorName: '낙방한 소크라테스',
    authorAvatar: '소',
    content: '다이어트 3일차, 식단 사진을 SNS에 올리며 의지를 다졌다. 그날 저녁 치킨을 시켰고, 사진은 조용히 삭제했다.',
    tags: ['다이어트실패', '작심삼일', '치킨은진리'],
    createdAt: '3시간 전',
    reactions: { '👑': 11, '🏺': 22, '🧪': 4, '🕯️': 17 },
    commentCount: 2,
  },
  {
    id: 'sample-15',
    category: 'daily',
    authorUid: 'sample-user-15',
    authorName: '유급한 디오게네스',
    authorAvatar: '디',
    content: '소개팅 앱 프로필 사진을 심혈을 기울여 보정했다. 실물을 본 상대의 첫 마디는 "앱이랑 다른 분이신가요?"였다.',
    tags: ['소개팅실패', '뽀샵논란', '인간관계'],
    createdAt: '3시간 전',
    reactions: { '👑': 7, '🏺': 14, '🧪': 5, '🕯️': 21 },
    commentCount: 1,
  },
  {
    id: 'sample-16',
    category: 'daily',
    authorUid: 'sample-user-16',
    authorName: '낙제생 플라톤',
    authorAvatar: '플',
    content: '친구 결혼식 축사를 부탁받고 "즉흥으로 해도 되겠지"라며 준비를 안 했다. 마이크를 잡은 순간 머릿속이 하얘졌고, 결국 신랑 이름을 신부 이름으로 세 번 불렀다.',
    tags: ['축사대참사', '즉흥의결말', '결혼식'],
    createdAt: '4시간 전',
    reactions: { '👑': 19, '🏺': 27, '🧪': 10, '🕯️': 35 },
    commentCount: 2,
  },
  {
    id: 'sample-17',
    category: 'daily',
    authorUid: 'sample-user-17',
    authorName: '탈락한 아리스토텔레스',
    authorAvatar: '아',
    content: '이번엔 정말 잘 키우겠다며 화분을 들였다. 정확히 12번째 식물이 시들었고, 화원 사장님은 이제 나를 보면 조용히 조화 코너를 가리킨다.',
    tags: ['반려식물', '연쇄살분마', '자기관리실패'],
    createdAt: '5시간 전',
    reactions: { '👑': 5, '🏺': 12, '🧪': 9, '🕯️': 18 },
    commentCount: 1,
  },
  {
    id: 'sample-18',
    category: 'daily',
    authorUid: 'sample-user-18',
    authorName: '독배마신 소크라테스',
    authorAvatar: '소',
    content: '출근길 지하철에서 딴생각을 하다 반대 방향 열차에 탔다. 그 사실을 세 정거장이 지나서야 깨달았고, 그날 지각 사유란에 "방향 감각 상실"이라고 쓸 뻔했다.',
    tags: ['지각사고', '출근길', '방향치'],
    createdAt: '6시간 전',
    reactions: { '👑': 3, '🏺': 9, '🧪': 4, '🕯️': 13 },
    commentCount: 0,
  },
  {
    id: 'sample-19',
    category: 'daily',
    authorUid: 'sample-user-19',
    authorName: '유배당한 유클리드',
    authorAvatar: '유',
    content: '첫 출근 날 늦잠을 자 택시로 달려간 끝에 도착했는데, 사무실 문을 열자 다들 정장을 입고 있었다. 나만 반바지 차림이었다는 걸 그제서야 알았다.',
    tags: ['첫출근', '복장사고', '민망'],
    createdAt: '7시간 전',
    reactions: { '👑': 13, '🏺': 21, '🧪': 6, '🕯️': 24 },
    commentCount: 1,
  },
  {
    id: 'sample-20',
    category: 'daily',
    authorUid: 'sample-user-20',
    authorName: '낙방한 피타고라스',
    authorAvatar: '피',
    content: '미용실에서 "숏컷으로 시원하게"라고 말했다. 디자이너님은 정말 시원하게 밀어주셨고, 나는 3개월 동안 모자를 벗지 못했다.',
    tags: ['미용실참사', '숏컷의범위', '모자필수'],
    createdAt: '8시간 전',
    reactions: { '👑': 21, '🏺': 30, '🧪': 8, '🕯️': 26 },
    commentCount: 2,
  },
  {
    id: 'sample-21',
    category: 'daily',
    authorUid: 'sample-user-21',
    authorName: '유급한 아리스토텔레스',
    authorAvatar: '아',
    content: '중고거래로 직거래를 나갔다가 현금만 받고 사라진 판매자를 만났다. 채팅방은 곧바로 폭파되었고, 남은 건 "거래 완료" 후기 하나뿐이었다.',
    tags: ['중고거래사기', '현타', '직거래주의'],
    createdAt: '9시간 전',
    reactions: { '👑': 8, '🏺': 17, '🧪': 11, '🕯️': 29 },
    commentCount: 1,
  },
  {
    id: 'sample-22',
    category: 'daily',
    authorUid: 'sample-user-22',
    authorName: '낙제생 소크라테스',
    authorAvatar: '소',
    content: '가족 단톡방에 친구에게 보내려던 사진을 잘못 전송했다. 삼촌이 제일 먼저 "이건 무슨 사진이니"라며 답장을 다셨다.',
    tags: ['단톡방사고', '가족모임', '현타'],
    createdAt: '10시간 전',
    reactions: { '👑': 9, '🏺': 14, '🧪': 5, '🕯️': 19 },
    commentCount: 1,
  },
  {
    id: 'sample-23',
    category: 'daily',
    authorUid: 'sample-user-23',
    authorName: '탈락한 플라톤',
    authorAvatar: '플',
    content: '지인 소개로 만난 소개팅 자리에서 서로 할 말이 없어 3시간 동안 날씨 얘기만 했다. 헤어질 때 둘 다 동시에 "다음에 또 봬요"라고 했지만 아무도 연락하지 않았다.',
    tags: ['소개팅실패', '정적', '인간관계'],
    createdAt: '11시간 전',
    reactions: { '👑': 4, '🏺': 11, '🧪': 7, '🕯️': 16 },
    commentCount: 0,
  },
  {
    id: 'sample-24',
    category: 'daily',
    authorUid: 'sample-user-24',
    authorName: '독배마신 피타고라스',
    authorAvatar: '피',
    content: '유튜브 홈트 영상을 보며 스쿼트 100개에 도전했다. 다음 날부터 3일간 계단을 뒷걸음질로 내려가야 했다.',
    tags: ['홈트실패', '근육통', '유튜브의배신'],
    createdAt: '13시간 전',
    reactions: { '👑': 6, '🏺': 13, '🧪': 10, '🕯️': 17 },
    commentCount: 1,
  },
  {
    id: 'sample-25',
    category: 'daily',
    authorUid: 'sample-user-25',
    authorName: '유배당한 디오게네스',
    authorAvatar: '디',
    content: '새해 첫날 다이어리를 사서 "오늘의 계획"을 빼곡히 적었다. 1월 3일 이후로는 페이지가 전부 하얗다.',
    tags: ['새해다짐', '작심삼일', '다이어리는장식'],
    createdAt: '15시간 전',
    reactions: { '👑': 3, '🏺': 8, '🧪': 4, '🕯️': 12 },
    commentCount: 0,
  },
  {
    id: 'sample-26',
    category: 'daily',
    authorUid: 'sample-user-26',
    authorName: '낙방한 유클리드',
    authorAvatar: '유',
    content: '인생 첫 캠핑에서 유튜브만 믿고 텐트에 도전했다. 자정이 넘도록 텐트는 세워지지 않았고, 결국 차 안에서 웅크려 잠들었다.',
    tags: ['캠핑실패', '텐트대참사', '아웃도어초보'],
    createdAt: '18시간 전',
    reactions: { '👑': 10, '🏺': 19, '🧪': 13, '🕯️': 22 },
    commentCount: 1,
  },
  {
    id: 'sample-27',
    category: 'daily',
    authorUid: 'sample-user-27',
    authorName: '유급한 플라톤',
    authorAvatar: '플',
    content: '이직용 자기소개서를 급하게 여러 회사에 돌리다가, 지원 동기란에 다른 회사 이름을 그대로 넣어 제출했다. 서류 탈락 메일은 유독 빨리 왔다.',
    tags: ['자소서사고', '이직실패', '복붙주의'],
    createdAt: '20시간 전',
    reactions: { '👑': 7, '🏺': 16, '🧪': 9, '🕯️': 20 },
    commentCount: 1,
  },
  {
    id: 'sample-28',
    category: 'daily',
    authorUid: 'sample-user-28',
    authorName: '낙제생 피타고라스',
    authorAvatar: '피',
    content: '소개팅 자리에서 어색함을 풀려고 전 애인 이야기를 꺼냈다. 상대의 표정이 굳는 걸 보고서야 그게 최악의 선택이었다는 걸 깨달았다.',
    tags: ['소개팅실패', 'TMI', '인간관계'],
    createdAt: '어제',
    reactions: { '👑': 5, '🏺': 10, '🧪': 6, '🕯️': 18 },
    commentCount: 0,
  },
  {
    id: 'sample-29',
    category: 'daily',
    authorUid: 'sample-user-29',
    authorName: '탈락한 소크라테스',
    authorAvatar: '소',
    content: '친구와 부먹찍먹 논쟁을 하다 언성이 높아졌다. 결국 서로 "너랑 다시는 탕수육 안 먹어"를 외치고 헤어졌고, 다음 날 아무렇지 않게 다시 만나 탕수육을 시켰다.',
    tags: ['부먹찍먹', '인간관계', '화해는탕수육으로'],
    createdAt: '어제',
    reactions: { '👑': 24, '🏺': 31, '🧪': 15, '🕯️': 28 },
    commentCount: 2,
  },
  {
    id: 'sample-30',
    category: 'daily',
    authorUid: 'sample-user-30',
    authorName: '독배마신 아리스토텔레스',
    authorAvatar: '아',
    content: '여자친구 생일에 급한 마음에 서랍 속 포장을 뜯지 않은 선물을 줬다. 알고 보니 그건 전 여자친구에게 주려다 못 준 선물이었고, 영수증까지 그대로 들어있었다.',
    tags: ['생일선물사고', '인간관계', '재활용의실패'],
    createdAt: '어제',
    reactions: { '👑': 18, '🏺': 25, '🧪': 12, '🕯️': 30 },
    commentCount: 2,
  },
  {
    id: 'sample-31',
    category: 'daily',
    authorUid: 'sample-user-31',
    authorName: '유배당한 유클리드',
    authorAvatar: '유',
    content: '자기계발을 하겠다며 온라인 강의를 결제했다. 수강률 3%에서 멈춘 화면은 반년째 그대로다.',
    tags: ['자기계발실패', '수강률3퍼센트', '결제만함'],
    createdAt: '2일 전',
    reactions: { '👑': 2, '🏺': 7, '🧪': 3, '🕯️': 10 },
    commentCount: 0,
  },
  {
    id: 'sample-32',
    category: 'daily',
    authorUid: 'sample-user-32',
    authorName: '낙방한 디오게네스',
    authorAvatar: '디',
    content: '헬스장 트레이너님이 자세를 봐주겠다며 거울 앞에 세웠다. 전신 거울로 보는 내 스쿼트 자세가 너무 부끄러워서 그날 이후 헬스장을 가지 않고 있다.',
    tags: ['헬스장실패', '거울의공포', '자기관리'],
    createdAt: '2일 전',
    reactions: { '👑': 6, '🏺': 12, '🧪': 7, '🕯️': 15 },
    commentCount: 1,
  },
  {
    id: 'sample-33',
    category: 'daily',
    authorUid: 'sample-user-33',
    authorName: '유급한 소크라테스',
    authorAvatar: '소',
    content: '가족 여행 숙소를 내가 예약하겠다고 나섰다가 날짜를 하루 잘못 잡았다. 도착한 숙소 앞에서 "예약자 없음"이라는 말을 들은 순간 가족 단톡방이 조용해졌다.',
    tags: ['가족여행', '예약사고', '현타'],
    createdAt: '3일 전',
    reactions: { '👑': 9, '🏺': 17, '🧪': 8, '🕯️': 20 },
    commentCount: 1,
  },
  {
    id: 'sample-34',
    category: 'maker',
    authorUid: 'sample-user-34',
    authorName: '낙방한 아리스토텔레스',
    authorAvatar: '아',
    content: '데모데이 발표 중 화면 공유 버튼을 눌렀는데 어제 밤에 몰래 보던 유튜브 탭이 그대로 노출되었다. 투자자들은 웃었고, 나는 웃지 못했다.',
    tags: ['데모데이참사', '화면공유사고', '스타트업'],
    createdAt: '10분 전',
    reactions: { '👑': 15, '🏺': 20, '🧪': 9, '🕯️': 24 },
    commentCount: 2,
  },
  {
    id: 'sample-35',
    category: 'maker',
    authorUid: 'sample-user-35',
    authorName: '유급한 유클리드',
    authorAvatar: '유',
    content: '급하게 짠 코드라 변수명을 a, b, c, asdf1234로 채웠다. 코드리뷰에서 팀장님이 "asdf1234가 뭐하는 애냐"고 물었을 때 나도 기억이 나지 않았다.',
    tags: ['코드리뷰참사', '변수명대충', '개발자의흑역사'],
    createdAt: '25분 전',
    reactions: { '👑': 9, '🏺': 16, '🧪': 22, '🕯️': 18 },
    commentCount: 2,
  },
  {
    id: 'sample-36',
    category: 'maker',
    authorUid: 'sample-user-36',
    authorName: '낙제생 디오게네스',
    authorAvatar: '디',
    content: '금요일 저녁, "이 정도 배포는 문제없겠지"라며 프로덕션에 올렸다. 주말 내내 장애 알림이 울렸고, 월요일 회고 제목은 "다시는 금요일에 배포하지 않는다"였다.',
    tags: ['금요일배포', '장애대응', '개발자의교훈'],
    createdAt: '40분 전',
    reactions: { '👑': 17, '🏺': 25, '🧪': 14, '🕯️': 30 },
    commentCount: 2,
  },
  {
    id: 'sample-37',
    category: 'maker',
    authorUid: 'sample-user-37',
    authorName: '탈락한 소크라테스',
    authorAvatar: '소',
    content: '브랜치를 헷갈려 git push --force를 날렸다. 팀원이 사흘간 짠 코드가 통째로 사라졌고, 나는 그날 이후로 force push 전에 세 번 되묻는 사람이 되었다.',
    tags: ['git대참사', 'force푸시주의', '팀원에게사죄'],
    createdAt: '1시간 전',
    reactions: { '👑': 33, '🏺': 38, '🧪': 20, '🕯️': 45 },
    commentCount: 2,
  },
  {
    id: 'sample-38',
    category: 'maker',
    authorUid: 'sample-user-38',
    authorName: '독배마신 플라톤',
    authorAvatar: '플',
    content: '회사 AI 챗봇에 자유도를 너무 많이 줬더니 고객 문의에 알 수 없는 시를 짓기 시작했다. 결국 서비스를 긴급 점검으로 내리고 밤새 프롬프트를 다시 짰다.',
    tags: ['AI챗봇사고', '프롬프트엔지니어링', '서비스장애'],
    createdAt: '1시간 전',
    reactions: { '👑': 19, '🏺': 22, '🧪': 27, '🕯️': 31 },
    commentCount: 1,
  },
  {
    id: 'sample-39',
    category: 'maker',
    authorUid: 'sample-user-39',
    authorName: '유배당한 피타고라스',
    authorAvatar: '피',
    content: '크라우드펀딩 목표 금액을 야심차게 1000만원으로 잡았다. 마감일 최종 모금액은 8만원, 후원자는 나와 어머니 두 명뿐이었다.',
    tags: ['크라우드펀딩실패', '목표금액1퍼센트', '가족의사랑'],
    createdAt: '2시간 전',
    reactions: { '👑': 10, '🏺': 18, '🧪': 8, '🕯️': 26 },
    commentCount: 2,
  },
  {
    id: 'sample-40',
    category: 'maker',
    authorUid: 'sample-user-40',
    authorName: '낙방한 유클리드',
    authorAvatar: '유',
    content: 'YC 지원서에 "세상을 바꿀 아이디어"라고 자신있게 썼다. 탈락 메일의 피드백은 "아이디어가 무엇인지 명확하지 않음" 한 줄이었다.',
    tags: ['YC탈락', '스타트업', '아이디어불명확'],
    createdAt: '3시간 전',
    reactions: { '👑': 14, '🏺': 19, '🧪': 11, '🕯️': 23 },
    commentCount: 1,
  },
  {
    id: 'sample-41',
    category: 'maker',
    authorUid: 'sample-user-41',
    authorName: '유급한 아리스토텔레스',
    authorAvatar: '아',
    content: '야심차게 오픈소스에 첫 PR을 올렸다. 메인테이너가 500줄짜리 리뷰 코멘트를 남기고 결국 "close"했을 때, 나는 그 저장소를 조용히 언팔로우했다.',
    tags: ['오픈소스도전', 'PR클로즈', '개발자의눈물'],
    createdAt: '4시간 전',
    reactions: { '👑': 8, '🏺': 15, '🧪': 19, '🕯️': 21 },
    commentCount: 2,
  },
  {
    id: 'sample-42',
    category: 'maker',
    authorUid: 'sample-user-42',
    authorName: '낙제생 플라톤',
    authorAvatar: '플',
    content: '코딩테스트에서 재귀 함수를 짜다 종료 조건을 빼먹었다. 채점 서버가 멈췄다는 알림과 함께 시험은 그대로 종료되었다.',
    tags: ['코딩테스트참사', '무한재귀', '종료조건필수'],
    createdAt: '5시간 전',
    reactions: { '👑': 12, '🏺': 20, '🧪': 16, '🕯️': 19 },
    commentCount: 1,
  },
  {
    id: 'sample-43',
    category: 'maker',
    authorUid: 'sample-user-43',
    authorName: '탈락한 디오게네스',
    authorAvatar: '디',
    content: '화이트보드 인터뷰에서 정렬 알고리즘을 짜라는 요청에 머릿속이 하얘졌다. 결국 "버블정렬"이라는 단어만 계속 되뇌다 면접이 끝났다.',
    tags: ['화이트보드인터뷰', '알고리즘까먹음', '면접긴장'],
    createdAt: '6시간 전',
    reactions: { '👑': 6, '🏺': 13, '🧪': 10, '🕯️': 17 },
    commentCount: 1,
  },
  {
    id: 'sample-44',
    category: 'maker',
    authorUid: 'sample-user-44',
    authorName: '독배마신 소크라테스',
    authorAvatar: '소',
    content: '테스트용으로 켜둔 클라우드 인스턴스를 끄는 걸 깜빡했다. 한 달 뒤 청구서를 보고 그 인스턴스가 조용히 내 월급의 절반을 태우고 있었다는 걸 알았다.',
    tags: ['클라우드요금폭탄', '인스턴스방치', '청구서의공포'],
    createdAt: '7시간 전',
    reactions: { '👑': 21, '🏺': 28, '🧪': 17, '🕯️': 33 },
    commentCount: 2,
  },
  {
    id: 'sample-45',
    category: 'maker',
    authorUid: 'sample-user-45',
    authorName: '유배당한 유클리드',
    authorAvatar: '유',
    content: '노코드로 3주 만에 앱을 만들어 야심차게 론칭했다. 사용자가 몰린 게 아니라 무한루프 버그가 몰려서 서버가 첫날 다운됐다.',
    tags: ['노코드론칭', '서버다운', '첫날부터장애'],
    createdAt: '8시간 전',
    reactions: { '👑': 13, '🏺': 21, '🧪': 15, '🕯️': 24 },
    commentCount: 1,
  },
  {
    id: 'sample-46',
    category: 'maker',
    authorUid: 'sample-user-46',
    authorName: '낙방한 플라톤',
    authorAvatar: '플',
    content: '킥스타터에 프로젝트를 올리며 목표를 500만원으로 잡았다. 마감까지 모인 후원자는 3명, 그중 한 명은 나였다.',
    tags: ['킥스타터실패', '후원자3명', '셀프후원'],
    createdAt: '9시간 전',
    reactions: { '👑': 9, '🏺': 16, '🧪': 7, '🕯️': 20 },
    commentCount: 1,
  },
  {
    id: 'sample-47',
    category: 'maker',
    authorUid: 'sample-user-47',
    authorName: '유급한 디오게네스',
    authorAvatar: '디',
    content: '6개월간 준비한 아이디어로 특허를 출원했다. 심사 결과 3년 전 이미 똑같은 특허가 등록되어 있다는 통보를 받았다.',
    tags: ['특허출원반려', '선행기술존재', '헛수고6개월'],
    createdAt: '10시간 전',
    reactions: { '👑': 11, '🏺': 17, '🧪': 13, '🕯️': 25 },
    commentCount: 1,
  },
  {
    id: 'sample-48',
    category: 'maker',
    authorUid: 'sample-user-48',
    authorName: '낙제생 아리스토텔레스',
    authorAvatar: '아',
    content: '새로 산 3D프린터로 첫 출력물에 도전했다. 노즐 온도 설정을 잘못해 결과물은 정체불명의 플라스틱 웅덩이가 되었다.',
    tags: ['3D프린터실패', '설정미스', '플라스틱웅덩이'],
    createdAt: '11시간 전',
    reactions: { '👑': 5, '🏺': 11, '🧪': 14, '🕯️': 16 },
    commentCount: 0,
  },
  {
    id: 'sample-49',
    category: 'maker',
    authorUid: 'sample-user-49',
    authorName: '탈락한 피타고라스',
    authorAvatar: '피',
    content: '하드웨어 프로토타입 배터리 회로를 급하게 연결했다. 전원을 넣자마자 연기가 피어올랐고, 사무실 화재경보기가 울렸다.',
    tags: ['하드웨어참사', '회로연결미스', '화재경보'],
    createdAt: '12시간 전',
    reactions: { '👑': 22, '🏺': 26, '🧪': 19, '🕯️': 29 },
    commentCount: 2,
  },
  {
    id: 'sample-50',
    category: 'maker',
    authorUid: 'sample-user-50',
    authorName: '독배마신 유클리드',
    authorAvatar: '유',
    content: '야심차게 출시한 앱에 첫 리뷰가 달렸다. 별점 1개, 내용은 "앱이 자꾸 꺼져요"였고, 확인해보니 정말 그랬다.',
    tags: ['앱스토어리뷰', '별점1개', '버그를뒤늦게발견'],
    createdAt: '13시간 전',
    reactions: { '👑': 7, '🏺': 14, '🧪': 9, '🕯️': 18 },
    commentCount: 1,
  },
  {
    id: 'sample-51',
    category: 'maker',
    authorUid: 'sample-user-51',
    authorName: '유배당한 소크라테스',
    authorAvatar: '소',
    content: '1년 전 야심차게 올린 오픈소스 프로젝트의 깃허브 스타 개수를 확인했다. 여전히 0개였고, 심지어 내가 준 스타도 취소되어 있었다.',
    tags: ['깃허브스타0개', '1년째방치', '현타'],
    createdAt: '15시간 전',
    reactions: { '👑': 4, '🏺': 9, '🧪': 6, '🕯️': 13 },
    commentCount: 1,
  },
  {
    id: 'sample-52',
    category: 'maker',
    authorUid: 'sample-user-52',
    authorName: '낙방한 아리스토텔레스',
    authorAvatar: '아',
    content: '프로덕트 헌트에 자정 정각 론칭을 노렸다. 24시간 뒤 순위는 상위 100위 밖, 투표해준 사람은 팀원 세 명뿐이었다.',
    tags: ['프로덕트헌트', '순위권밖', '팀원의사랑'],
    createdAt: '18시간 전',
    reactions: { '👑': 8, '🏺': 15, '🧪': 10, '🕯️': 19 },
    commentCount: 1,
  },
  {
    id: 'sample-53',
    category: 'maker',
    authorUid: 'sample-user-53',
    authorName: '유급한 플라톤',
    authorAvatar: '플',
    content: '투자 유치를 위해 정성껏 쓴 콜드메일을 200개 투자사에 보냈다. 돌아온 답장은 0통, 스팸함으로 분류됐다는 사실만 나중에 알았다.',
    tags: ['콜드메일', '투자유치실패', '스팸함행'],
    createdAt: '20시간 전',
    reactions: { '👑': 12, '🏺': 18, '🧪': 11, '🕯️': 22 },
    commentCount: 2,
  },
  {
    id: 'sample-54',
    category: 'maker',
    authorUid: 'sample-user-54',
    authorName: '낙제생 유클리드',
    authorAvatar: '유',
    content: '3개월간 밤새 만든 MVP를 배포했다. 접속자 로그를 확인해보니 유일한 사용자는 나였고, 그마저도 테스트 계정이었다.',
    tags: ['MVP사용자없음', '나혼자테스트', '서비스개점휴업'],
    createdAt: '어제',
    reactions: { '👑': 16, '🏺': 23, '🧪': 12, '🕯️': 28 },
    commentCount: 2,
  },
  {
    id: 'sample-55',
    category: 'maker',
    authorUid: 'sample-user-55',
    authorName: '탈락한 디오게네스',
    authorAvatar: '디',
    content: '다섯 번째 피벗을 선언하는 순간 팀원 두 명이 동시에 퇴사 의사를 밝혔다. 회의실엔 나와 화이트보드에 적힌 여섯 번째 아이디어만 남았다.',
    tags: ['피벗5회째', '팀와해', '창업자의고독'],
    createdAt: '어제',
    reactions: { '👑': 20, '🏺': 24, '🧪': 15, '🕯️': 32 },
    commentCount: 2,
  },
  {
    id: 'sample-56',
    category: 'maker',
    authorUid: 'sample-user-56',
    authorName: '독배마신 아리스토텔레스',
    authorAvatar: '아',
    content: '공동창업자와 지분 배분 이야기를 하다 언성이 높아졌다. 결국 지분 계약서 대신 절교 선언문을 쓰게 되었다.',
    tags: ['공동창업자갈등', '지분문제', '동업의어려움'],
    createdAt: '어제',
    reactions: { '👑': 14, '🏺': 19, '🧪': 13, '🕯️': 26 },
    commentCount: 1,
  },
  {
    id: 'sample-57',
    category: 'maker',
    authorUid: 'sample-user-57',
    authorName: '유배당한 플라톤',
    authorAvatar: '플',
    content: '유닛테스트를 나중에 짜겠다고 미루다 배포 전날까지 커버리지 0%였다. 대표님이 코드 커버리지 리포트를 열어보는 순간 사무실 공기가 얼어붙었다.',
    tags: ['테스트커버리지0', '대표님발각', '뒤늦은후회'],
    createdAt: '2일 전',
    reactions: { '👑': 13, '🏺': 20, '🧪': 17, '🕯️': 24 },
    commentCount: 2,
  },
  {
    id: 'sample-58',
    category: 'maker',
    authorUid: 'sample-user-58',
    authorName: '낙방한 소크라테스',
    authorAvatar: '소',
    content: '레거시 코드를 깔끔하게 리팩토링하겠다며 손을 댔다. 결과적으로 기존 버그 하나를 고치고 새로운 버그 다섯 개를 만들어냈다.',
    tags: ['리팩토링참사', '버그5배증식', '건드리지말걸'],
    createdAt: '2일 전',
    reactions: { '👑': 11, '🏺': 17, '🧪': 14, '🕯️': 20 },
    commentCount: 1,
  },
  {
    id: 'sample-59',
    category: 'maker',
    authorUid: 'sample-user-59',
    authorName: '유급한 피타고라스',
    authorAvatar: '피',
    content: '머지 컨플릭트를 해결하다 급한 마음에 아무 버튼이나 눌렀다. 정신을 차려보니 동료가 짠 코드 절반이 사라져 있었다.',
    tags: ['머지컨플릭트', '코드유실', '깃은어렵다'],
    createdAt: '3일 전',
    reactions: { '👑': 15, '🏺': 21, '🧪': 18, '🕯️': 25 },
    commentCount: 2,
  },
  {
    id: 'sample-60',
    category: 'maker',
    authorUid: 'sample-user-60',
    authorName: '낙제생 디오게네스',
    authorAvatar: '디',
    content: '간단한 정규식이라 생각하고 빠르게 짜서 배포했다. 특정 입력값에서 재앙적 백트래킹이 발생해 서버 CPU가 100%를 찍고 그대로 다운됐다.',
    tags: ['정규식재앙', '서버다운', '백트래킹공포'],
    createdAt: '3일 전',
    reactions: { '👑': 18, '🏺': 24, '🧪': 22, '🕯️': 27 },
    commentCount: 2,
  },
  {
    id: 'sample-61',
    category: 'maker',
    authorUid: 'sample-user-61',
    authorName: '탈락한 유클리드',
    authorAvatar: '유',
    content: 'DB 마이그레이션 전 백업 스크립트를 돌렸는데 파일명이 어제 백업과 겹쳐 덮어써졌다. 복구할 백업이 없다는 사실은 장애가 터진 뒤에야 알았다.',
    tags: ['백업미스', 'DB마이그레이션', '복구불가'],
    createdAt: '4일 전',
    reactions: { '👑': 25, '🏺': 29, '🧪': 20, '🕯️': 38 },
    commentCount: 2,
  },
  {
    id: 'sample-62',
    category: 'maker',
    authorUid: 'sample-user-62',
    authorName: '독배마신 플라톤',
    authorAvatar: '플',
    content: '외부 API 연동 코드에 무한루프 버그가 숨어있는 줄 모르고 배포했다. 하루 한도 요청량을 서비스 오픈 1시간 만에 다 써버렸다.',
    tags: ['API레이트리밋', '무한루프', '서비스오픈1시간만에'],
    createdAt: '4일 전',
    reactions: { '👑': 10, '🏺': 17, '🧪': 13, '🕯️': 21 },
    commentCount: 1,
  },
  {
    id: 'sample-63',
    category: 'maker',
    authorUid: 'sample-user-63',
    authorName: '유배당한 아리스토텔레스',
    authorAvatar: '아',
    content: '구독 결제 시스템 버그로 일부 사용자에게 결제가 두 번씩 청구됐다. 환불 문의 메일함이 폭주하는 동안 나는 콘솔 로그만 하염없이 들여다봤다.',
    tags: ['결제버그', '이중청구', '환불대참사'],
    createdAt: '5일 전',
    reactions: { '👑': 19, '🏺': 25, '🧪': 16, '🕯️': 30 },
    commentCount: 2,
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
  'sample-4': [
    { id: 'c1', authorName: '유급한 플라톤', avatar: '플', content: '계획엔 있었지만 우산 항목이 삭제됐나 봅니다.', time: '5분 전' },
  ],
  'sample-5': [
    { id: 'c1', authorName: '낙제생 디오게네스', avatar: '디', content: '3개월 3번이면 1회당 감정가가 어마어마하네요.', time: '방금 전' },
    { id: 'c2', authorName: '탈락한 유클리드', avatar: '유', content: 'PT쌤도 이제 포기하신 눈치네요.', time: '방금 전' },
  ],
  'sample-7': [
    { id: 'c1', authorName: '낙방한 피타고라스', avatar: '피', content: '삭제는 흔적을 남길 뿐입니다.', time: '18분 전' },
    { id: 'c2', authorName: '유급한 아리스토텔레스', avatar: '아', content: '손절 각오하고 스크린샷은 저장하셨나요.', time: '15분 전' },
  ],
  'sample-8': [
    { id: 'c1', authorName: '독배마신 유클리드', avatar: '유', content: '이름은 몰라도 열정은 진짜였네요.', time: '30분 전' },
  ],
  'sample-9': [
    { id: 'c1', authorName: '낙제생 소크라테스', avatar: '소', content: '이름 대신 계산을 기억하시는 게 낫겠습니다.', time: '40분 전' },
  ],
  'sample-10': [
    { id: 'c1', authorName: '탈락한 플라톤', avatar: '플', content: '강아지도 반골 기질이 있나 봅니다.', time: '50분 전' },
  ],
  'sample-11': [
    { id: 'c1', authorName: '독배마신 아리스토텔레스', avatar: '아', content: '싼 게 비지떡이라는 명제는 항상 참입니다.', time: '1시간 전' },
  ],
  'sample-13': [
    { id: 'c1', authorName: '낙방한 유클리드', avatar: '유', content: '고음은 성대의 영역이 아니라 재능의 영역입니다.', time: '1시간 전' },
  ],
  'sample-14': [
    { id: 'c1', authorName: '유배당한 소크라테스', avatar: '소', content: '치킨 앞에서 의지는 항상 집니다.', time: '2시간 전' },
    { id: 'c2', authorName: '낙제생 피타고라스', avatar: '피', content: '사진 삭제도 증거인멸의 일종입니다.', time: '2시간 전' },
  ],
  'sample-15': [
    { id: 'c1', authorName: '탈락한 디오게네스', avatar: '디', content: '보정 전과 후, 어느 쪽이 진짜 나인가 하는 철학적 질문이네요.', time: '2시간 전' },
  ],
  'sample-16': [
    { id: 'c1', authorName: '독배마신 유클리드', avatar: '유', content: '즉흥은 준비된 자의 특권입니다.', time: '3시간 전' },
    { id: 'c2', authorName: '유급한 소크라테스', avatar: '소', content: '신랑분이 세 번째엔 그냥 웃으셨을 것 같네요.', time: '3시간 전' },
  ],
  'sample-17': [
    { id: 'c1', authorName: '낙방한 아리스토텔레스', avatar: '아', content: '이쯤 되면 조화도 나쁘지 않습니다.', time: '4시간 전' },
  ],
  'sample-19': [
    { id: 'c1', authorName: '유배당한 피타고라스', avatar: '피', content: '반바지도 나름의 자유분방함이었습니다.', time: '6시간 전' },
  ],
  'sample-20': [
    { id: 'c1', authorName: '낙제생 유클리드', avatar: '유', content: '시원함의 정의가 사람마다 다릅니다.', time: '7시간 전' },
    { id: 'c2', authorName: '탈락한 소크라테스', avatar: '소', content: '모자도 하나의 스타일이 될 수 있습니다.', time: '7시간 전' },
  ],
  'sample-21': [
    { id: 'c1', authorName: '독배마신 플라톤', avatar: '플', content: '직거래는 신뢰의 영역이 아니었습니다.', time: '8시간 전' },
  ],
  'sample-22': [
    { id: 'c1', authorName: '유배당한 아리스토텔레스', avatar: '아', content: '삼촌도 궁금해하실 만합니다.', time: '9시간 전' },
  ],
  'sample-24': [
    { id: 'c1', authorName: '낙방한 디오게네스', avatar: '디', content: '유튜브는 결과를 책임지지 않습니다.', time: '11시간 전' },
  ],
  'sample-26': [
    { id: 'c1', authorName: '유급한 유클리드', avatar: '유', content: '차박도 캠핑의 일종으로 쳐드리겠습니다.', time: '16시간 전' },
  ],
  'sample-27': [
    { id: 'c1', authorName: '낙제생 아리스토텔레스', avatar: '아', content: '복붙은 항상 흔적을 남깁니다.', time: '18시간 전' },
  ],
  'sample-29': [
    { id: 'c1', authorName: '탈락한 피타고라스', avatar: '피', content: '탕수육 앞에서 우정은 회복됩니다.', time: '어제' },
    { id: 'c2', authorName: '독배마신 소크라테스', avatar: '소', content: '부먹이 진리이긴 합니다.', time: '어제' },
  ],
  'sample-30': [
    { id: 'c1', authorName: '유배당한 유클리드', avatar: '유', content: '영수증까지는 확인하셨어야죠.', time: '어제' },
    { id: 'c2', authorName: '낙방한 플라톤', avatar: '플', content: '재활용은 좋지만 대상 선정이 아쉽습니다.', time: '어제' },
  ],
  'sample-32': [
    { id: 'c1', authorName: '유급한 디오게네스', avatar: '디', content: '거울은 때로 너무 정직합니다.', time: '어제' },
  ],
  'sample-33': [
    { id: 'c1', authorName: '낙제생 소크라테스', avatar: '소', content: '가족여행의 예약자는 신중해야 합니다.', time: '2일 전' },
  ],
  'sample-34': [
    { id: 'c1', authorName: '유배당한 유클리드', avatar: '유', content: '투자자들도 취향은 알아보시네요.', time: '5분 전' },
    { id: 'c2', authorName: '낙방한 플라톤', avatar: '플', content: '탭 정리는 발표 전 필수입니다.', time: '3분 전' },
  ],
  'sample-35': [
    { id: 'c1', authorName: '유급한 소크라테스', avatar: '소', content: 'asdf1234는 이제 전설이 되었습니다.', time: '20분 전' },
    { id: 'c2', authorName: '낙제생 아리스토텔레스', avatar: '아', content: '변수명도 유산이 될 수 있습니다.', time: '18분 전' },
  ],
  'sample-36': [
    { id: 'c1', authorName: '탈락한 디오게네스', avatar: '디', content: '금요일 배포는 인류의 오랜 교훈입니다.', time: '35분 전' },
    { id: 'c2', authorName: '독배마신 피타고라스', avatar: '피', content: '월요일 회고가 곧 참회록이었네요.', time: '30분 전' },
  ],
  'sample-37': [
    { id: 'c1', authorName: '유배당한 소크라테스', avatar: '소', content: 'force는 신중해야 하는 단어입니다.', time: '55분 전' },
    { id: 'c2', authorName: '낙방한 유클리드', avatar: '유', content: '팀원분께 사죄의 커피라도 드리세요.', time: '50분 전' },
  ],
  'sample-38': [
    { id: 'c1', authorName: '유급한 아리스토텔레스', avatar: '아', content: 'AI도 가끔은 시인이 되고 싶었나 봅니다.', time: '1시간 전' },
  ],
  'sample-39': [
    { id: 'c1', authorName: '낙제생 플라톤', avatar: '플', content: '어머니의 후원은 늘 든든합니다.', time: '2시간 전' },
    { id: 'c2', authorName: '탈락한 디오게네스', avatar: '디', content: '8만원도 소중한 시드머니입니다.', time: '2시간 전' },
  ],
  'sample-40': [
    { id: 'c1', authorName: '독배마신 소크라테스', avatar: '소', content: '명확함은 언제나 중요합니다.', time: '3시간 전' },
  ],
  'sample-41': [
    { id: 'c1', authorName: '유배당한 유클리드', avatar: '유', content: '500줄 리뷰면 거의 논문이네요.', time: '4시간 전' },
    { id: 'c2', authorName: '낙방한 아리스토텔레스', avatar: '아', content: '언팔은 최후의 존엄입니다.', time: '3시간 전' },
  ],
  'sample-42': [
    { id: 'c1', authorName: '유급한 플라톤', avatar: '플', content: '종료 조건은 인생에도 필요합니다.', time: '5시간 전' },
  ],
  'sample-43': [
    { id: 'c1', authorName: '낙제생 유클리드', avatar: '유', content: '버블정렬만 기억나도 절반은 성공입니다.', time: '5시간 전' },
  ],
  'sample-44': [
    { id: 'c1', authorName: '탈락한 소크라테스', avatar: '소', content: '클라우드는 끄는 것도 실력입니다.', time: '6시간 전' },
    { id: 'c2', authorName: '독배마신 아리스토텔레스', avatar: '아', content: '청구서가 곧 채점표였네요.', time: '6시간 전' },
  ],
  'sample-45': [
    { id: 'c1', authorName: '유배당한 플라톤', avatar: '플', content: '버그도 인기의 증거라면 증거입니다.', time: '7시간 전' },
  ],
  'sample-46': [
    { id: 'c1', authorName: '낙방한 유클리드', avatar: '유', content: '셀프 후원도 후원은 후원입니다.', time: '8시간 전' },
  ],
  'sample-47': [
    { id: 'c1', authorName: '유급한 디오게네스', avatar: '디', content: '선행기술 검색이 먼저였습니다.', time: '9시간 전' },
  ],
  'sample-49': [
    { id: 'c1', authorName: '탈락한 유클리드', avatar: '유', content: '연기 나면 이미 늦은 겁니다.', time: '11시간 전' },
    { id: 'c2', authorName: '독배마신 플라톤', avatar: '플', content: '화재경보기도 QA의 일부였네요.', time: '10시간 전' },
  ],
  'sample-50': [
    { id: 'c1', authorName: '유배당한 아리스토텔레스', avatar: '아', content: '별점 1개도 피드백은 피드백입니다.', time: '12시간 전' },
  ],
  'sample-51': [
    { id: 'c1', authorName: '낙제생 소크라테스', avatar: '소', content: '스타 취소는 좀 잔인합니다.', time: '14시간 전' },
  ],
  'sample-52': [
    { id: 'c1', authorName: '탈락한 플라톤', avatar: '플', content: '팀원 세 명의 사랑은 진짜입니다.', time: '17시간 전' },
  ],
  'sample-53': [
    { id: 'c1', authorName: '독배마신 유클리드', avatar: '유', content: '스팸함이 진짜 범인이었네요.', time: '19시간 전' },
    { id: 'c2', authorName: '유배당한 소크라테스', avatar: '소', content: '200통이면 이미 큰 용기입니다.', time: '18시간 전' },
  ],
  'sample-54': [
    { id: 'c1', authorName: '낙방한 플라톤', avatar: '플', content: '테스트 계정도 사용자는 사용자입니다.', time: '어제' },
    { id: 'c2', authorName: '유급한 디오게네스', avatar: '디', content: '일단 서비스는 살아있네요.', time: '어제' },
  ],
  'sample-55': [
    { id: 'c1', authorName: '탈락한 아리스토텔레스', avatar: '아', content: '여섯 번째 아이디어는 다를 수도 있습니다.', time: '어제' },
    { id: 'c2', authorName: '독배마신 유클리드', avatar: '유', content: '피벗도 반복하면 근육이 됩니다.', time: '어제' },
  ],
  'sample-56': [
    { id: 'c1', authorName: '유배당한 피타고라스', avatar: '피', content: '지분은 우정보다 먼저 정해야 합니다.', time: '어제' },
  ],
  'sample-57': [
    { id: 'c1', authorName: '낙제생 소크라테스', avatar: '소', content: '커버리지 0%는 용기라면 용기입니다.', time: '2일 전' },
    { id: 'c2', authorName: '탈락한 플라톤', avatar: '플', content: '대표님 표정이 눈에 선합니다.', time: '2일 전' },
  ],
  'sample-58': [
    { id: 'c1', authorName: '독배마신 아리스토텔레스', avatar: '아', content: '레거시는 함부로 건드리는 게 아닙니다.', time: '2일 전' },
  ],
  'sample-59': [
    { id: 'c1', authorName: '유배당한 유클리드', avatar: '유', content: '머지는 항상 신중해야 합니다.', time: '3일 전' },
    { id: 'c2', authorName: '낙방한 소크라테스', avatar: '소', content: '동료분께 커피 한 잔 사세요.', time: '2일 전' },
  ],
  'sample-60': [
    { id: 'c1', authorName: '유급한 아리스토텔레스', avatar: '아', content: '정규식은 화요일에도 무섭습니다.', time: '3일 전' },
    { id: 'c2', authorName: '낙제생 플라톤', avatar: '플', content: '백트래킹이라는 단어부터 불길했습니다.', time: '3일 전' },
  ],
  'sample-61': [
    { id: 'c1', authorName: '탈락한 디오게네스', avatar: '디', content: '백업은 이름부터 신중해야 합니다.', time: '4일 전' },
    { id: 'c2', authorName: '독배마신 소크라테스', avatar: '소', content: '이게 바로 재난 상황입니다.', time: '4일 전' },
  ],
  'sample-62': [
    { id: 'c1', authorName: '유배당한 플라톤', avatar: '플', content: '1시간 만에 한도 초과는 새로운 기록입니다.', time: '4일 전' },
  ],
  'sample-63': [
    { id: 'c1', authorName: '낙방한 유클리드', avatar: '유', content: '환불 메일함도 고생이 많으십니다.', time: '5일 전' },
    { id: 'c2', authorName: '유급한 디오게네스', avatar: '디', content: '결제 시스템은 두 번 확인해야 합니다.', time: '4일 전' },
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

function startPostsListening() {
  if (postsUnsubscribe) return;
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
}

function startListening(uid) {
  startPostsListening();

  if (userDocUnsubscribe) userDocUnsubscribe();
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
    if (!isObserverMode) {
      stopListening();
    }
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

// Compliant AppsInToss login path (the only production path). Signs in via
// Toss, then guarantees a profile document exists for the resulting uid.
//
// This deliberately has NO fallback. An earlier version caught every failure
// and signed the user into one shared hardcoded account, which meant every
// user ended up on the same uid - same profile, same nickname, same post
// author - and shipped that account's password in the web bundle. Failures
// must propagate so the caller can show them; a failed login is not a login.
async function signInWithToss() {
  await tossSignIn();
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
    startPostsListening();
    notify();
  },

  exitObserver() {
    isObserverMode = false;
    if (!authUser) {
      stopListening();
    }
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
    if ((authUser || isObserverMode) && !commentsUnsubscribes[postId]) {
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
