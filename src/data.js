import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'academia_store_v2';

// category: 'maker'(만드는 자의 실패) | 'daily'(일상의 실패)
let posts = [
  // ───────────── 기존 소장품 ─────────────
  {
    id: 'post-1',
    category: 'daily',
    authorName: '낙방한 소크라테스',
    authorAvatar: 'S',
    content: '아테네 청년들을 타락시켰다는 죄명으로 법정에 섰습니다. 배심원들 앞에서 기막힌 궤변으로 반박해서 모두를 설득해 보려 했으나, 오히려 역효과가 나서 사형 판결(독배 엔딩)을 받았습니다. 역대급 설득 실패 사건이지만, 덕분에 "악법도 법이다"라는 희대의 명언을 남겼으니 이것은 성공일까요 실패일까요? 🏺',
    tags: ['토론폭망', '변론실패', '독배엔딩'],
    createdAt: '방금 전',
    reactions: { '👑': 18, '🏺': 25, '🧪': 6, '🕯️': 30 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-2',
    category: 'maker',
    authorName: '유급한 피타고라스',
    authorAvatar: 'P',
    content: '세상의 모든 것이 정수와 분수의 비율로 설명될 수 있다고 제자들에게 큰소리쳤습니다. 그런데 한 제자가 정사각형 대각선 길이를 구하더니 "루트 2"라는 무리수를 들고 와서 증명하라고 하더군요. 화가 나서 그 제자를 우물에 던지라고 지시했습니다. 진리 수호에는 실패했지만 비밀 유지에는 성공(?)했습니다. 비밀을 들고 간 제자의 명복을 빕니다. 🕯️',
    tags: ['증명실패', '비밀주의', '무리수사건'],
    createdAt: '2시간 전',
    reactions: { '👑': 12, '🏺': 10, '🧪': 22, '🕯️': 15 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-3',
    category: 'maker',
    authorName: '낙제생 아리스토텔레스',
    authorAvatar: 'A',
    content: '스승인 플라톤의 이데아론을 세미나에서 정면으로 비판하다가 학당에서 쫓겨날 뻔했습니다. "스승님은 소중하지만 진리는 더 소중하다"고 멋지게 외쳤는데, 그 날 저녁 스승님께 호되게 꾸지람을 듣고 학당 구석에서 밤새 오답노트를 적었습니다. 학술 토론은 폭망했지만 오답노트 하나는 확실히 채웠습니다. 🧪',
    tags: ['스승저격', '토론폭망', '오답노트'],
    createdAt: '어제',
    reactions: { '👑': 22, '🏺': 14, '🧪': 19, '🕯️': 8 },
    myReactions: [],
    seed: true,
  },

  // ───────────── 메이커 전시관 ─────────────
  {
    id: 'post-m1',
    category: 'maker',
    authorName: '추락한 이카로스',
    authorAvatar: '이',
    content: '아버지가 만들어준 밀랍 날개를 달고 하늘로 날아올랐습니다. 인류 최초의 웨어러블 비행 디바이스였죠. 다만 "태양 근처엔 가지 마라"는 QA 지침을 무시하고 고도를 계속 올렸다가 밀랍이 녹아 추락했습니다. 발열 테스트를 건너뛴 프로토타입의 최후였습니다. 🕯️',
    tags: ['발명폭망', '프로토타입', '발열이슈'],
    createdAt: '3시간 전',
    reactions: { '👑': 41, '🏺': 33, '🧪': 12, '🕯️': 55 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m2',
    category: 'maker',
    authorName: '갇혀버린 다이달로스',
    authorAvatar: '다',
    content: '미노스 왕의 의뢰로 절대 빠져나올 수 없는 미궁 라비린토스를 설계했습니다. 완벽한 작품이었습니다. 너무 완벽한 나머지 설계자인 저조차 길을 잃었죠. 사용자 경험을 1도 고려하지 않은 오버엔지니어링의 표본으로 남았습니다. 🏺',
    tags: ['설계미스', '미로설계', 'UX참사'],
    createdAt: '어제',
    reactions: { '👑': 22, '🏺': 40, '🧪': 18, '🕯️': 9 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m3',
    category: 'maker',
    authorName: '목욕탕의 아르키메데스',
    authorAvatar: '아',
    content: '왕관의 순금 여부를 밝히라는 난제를 목욕탕에서 풀어냈습니다. 부력의 원리를 깨닫는 순간 "유레카"를 외쳤죠. 발견은 완벽한 성공이었으나, 옷 입는 절차를 생략한 채 알몸으로 시내를 질주한 것은 명백한 배포 사고였습니다. 🧪',
    tags: ['실험실패', '노출사고', '유레카'],
    createdAt: '2일 전',
    reactions: { '👑': 30, '🏺': 20, '🧪': 44, '🕯️': 6 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m4',
    category: 'maker',
    authorName: '납기 놓친 피디아스',
    authorAvatar: '피',
    content: '세계 7대 불가사의가 될 제우스 신상 조각을 맡았습니다. 완벽을 위해 손톱 하나까지 30년을 다듬었죠. 예술적으로는 불멸의 걸작이었으나, 의뢰인이 완공을 못 보고 세상을 떠났습니다. 완벽주의는 최고의 미덕이자 최악의 납기 지연 사유입니다. 🏺',
    tags: ['납기폭망', '완벽주의'],
    createdAt: '3일 전',
    reactions: { '👑': 18, '🏺': 15, '🧪': 7, '🕯️': 11 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m5',
    category: 'maker',
    authorName: '시대를 앞선 헤론',
    authorAvatar: '헤',
    content: '증기의 힘으로 스스로 도는 공, 아에올리스의 공을 발명했습니다. 인류 최초의 증기기관이었죠. 발표회장의 반응은 "귀여운 장난감이네"가 전부였고, 상용화는 1800년 뒤로 미뤄졌습니다. 시장이 준비되지 않은 혁신은 그저 신기한 장난감입니다. 🕯️',
    tags: ['프로토타입', '시장검증실패', '증기기관'],
    createdAt: '4일 전',
    reactions: { '👑': 12, '🏺': 9, '🧪': 25, '🕯️': 14 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m6',
    category: 'maker',
    authorName: '오버플로우 유클리드',
    authorAvatar: '유',
    content: '기하학 전체를 단 5개의 공리로 세우는 데 성공했습니다. 다만 다섯 번째 평행선 공준만은 끝내 증명하지 못하고 "그냥 참이라고 치자"며 넘겼죠. 이 기술 부채는 2000년간 후배 수학자들을 괴롭혔습니다. 오답노트에 별표 다섯 개를 칩니다. 🧪',
    tags: ['증명실패', '오답노트', '기술부채'],
    createdAt: '5일 전',
    reactions: { '👑': 16, '🏺': 10, '🧪': 28, '🕯️': 8 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m7',
    category: 'maker',
    authorName: '트로이 목마 납품업자',
    authorAvatar: '목',
    content: '역사상 가장 정교한 목마를 납품했습니다. 내부 병력 수용, 외관 디테일, 이동식 바퀴까지 완벽한 물건이었죠. 문제는 적군 QA 담당이 검수도 없이 성문을 활짝 열어준 것입니다. 제품이 너무 훌륭하면 오히려 보안이 뚫린다는 교훈을 남겼습니다. 👑',
    tags: ['제작난항', 'QA통과', '납품'],
    createdAt: '6일 전',
    reactions: { '👑': 38, '🏺': 22, '🧪': 10, '🕯️': 7 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m8',
    category: 'maker',
    authorName: '무한동력 시시포스',
    authorAvatar: '시',
    content: '정상까지 바위를 올리는 영구기관 프로젝트를 맡았습니다. 매일 정상 직전까지 배포에 성공했으나, 그때마다 바위가 굴러떨어져 처음부터 롤백됐죠. 무한 반복 배포 파이프라인의 원조입니다. 오늘도 이터레이션 중입니다. 🏺',
    tags: ['무한루프', '오버엔지니어링', '롤백'],
    createdAt: '1주 전',
    reactions: { '👑': 9, '🏺': 13, '🧪': 6, '🕯️': 10 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m9',
    category: 'maker',
    authorName: '판도라 상자 배포팀',
    authorAvatar: '판',
    content: '절대 열어선 안 되는 상자를 제작해 필드에 배포했습니다. 보안 대책이라곤 "열지 마시오" 스티커 한 장이 전부였죠. 결과적으로 세상의 모든 근심이 유출됐습니다. 사용자는 언제나 열지 말라는 것을 엽니다. 🕯️',
    tags: ['보안폭망', '프로토타입', '배포사고'],
    createdAt: '1주 전',
    reactions: { '👑': 14, '🏺': 11, '🧪': 9, '🕯️': 20 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m10',
    category: 'maker',
    authorName: '바벨탑 현장소장',
    authorAvatar: '바',
    content: '하늘에 닿는 탑을 세우는 초대형 프로젝트의 현장소장이었습니다. 인부들의 언어가 갑자기 제각각으로 흩어지면서 협업이 붕괴됐죠. 스펙 문서가 70개 언어로 번역되는 순간 프로젝트는 중단됐습니다. 소통 없는 규모 확장의 최후입니다. 🏺',
    tags: ['설계미스', '소통폭망', '협업참사'],
    createdAt: '2주 전',
    reactions: { '👑': 20, '🏺': 18, '🧪': 11, '🕯️': 13 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m11',
    category: 'maker',
    authorName: '번아웃 헤파이스토스',
    authorAvatar: '파',
    content: '올림포스 모든 신들의 무기와 장신구를 홀로 제작하는 대장장이입니다. 아무도 야근을 알아주지 않았고, 정작 제가 만든 무기로 신들은 서로 싸웠습니다. 최고의 기술력, 최악의 워라밸이었습니다. 🕯️',
    tags: ['제작난항', '야근인생', '번아웃'],
    createdAt: '2주 전',
    reactions: { '👑': 17, '🏺': 14, '🧪': 8, '🕯️': 22 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-m12',
    category: 'maker',
    authorName: '지렛대 아르키메데스',
    authorAvatar: '지',
    content: '"충분히 긴 지렛대와 받침점만 있다면 지구도 들어올리겠다"고 호기롭게 선언했습니다. 이론은 완벽했습니다. 다만 우주 어디에도 그 받침점을 놓을 자리가 없었죠. 전제 조건을 확보하지 못한 명언은 그저 허세로 남았습니다. 🧪',
    tags: ['오버엔지니어링', '증명실패', '허세'],
    createdAt: '3주 전',
    reactions: { '👑': 24, '🏺': 16, '🧪': 30, '🕯️': 9 },
    myReactions: [],
    seed: true,
  },

  // ───────────── 일상 전시관 ─────────────
  {
    id: 'post-d1',
    category: 'daily',
    authorName: '통 속의 디오게네스',
    authorAvatar: '디',
    content: '무소유를 실천하기 위해 집을 버리고 항아리 속으로 들어갔습니다. 미니멀 라이프의 원조였죠. 알렉산더 대왕이 찾아와 소원을 묻자 "햇빛 가리니 좀 비켜달라"고 답했습니다. 인생 최대의 인맥을 그 자리에서 날렸습니다. 🏺',
    tags: ['일상폭망', '인간관계', '미니멀실패'],
    createdAt: '1시간 전',
    reactions: { '👑': 35, '🏺': 40, '🧪': 12, '🕯️': 10 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d2',
    category: 'daily',
    authorName: '물에 비친 나르키소스',
    authorAvatar: '나',
    content: '물가에 비친 제 얼굴에 그만 반해버렸습니다. 도무지 자리를 뜰 수 없어 하루 종일 물만 바라봤죠. 인류 최초의 셀카 중독 사례로 기록됐습니다. 결국 밥도 굶고 그 자리에서 꽃이 되었습니다. 🕯️',
    tags: ['일상폭망', '셀카중독'],
    createdAt: '2시간 전',
    reactions: { '👑': 28, '🏺': 15, '🧪': 9, '🕯️': 18 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d3',
    category: 'daily',
    authorName: '손대는 족족 미다스',
    authorAvatar: '미',
    content: '만지는 것마다 황금으로 변하는 능력을 소원으로 빌었습니다. 부자가 되는 건 순식간이었죠. 문제는 빵도, 물도, 사랑하는 딸까지 전부 금덩이가 됐다는 것입니다. 통장은 빵빵한데 굶어 죽게 생겼습니다. 🏺',
    tags: ['일상폭망', '식사참사', '과유불급'],
    createdAt: '3시간 전',
    reactions: { '👑': 40, '🏺': 30, '🧪': 11, '🕯️': 14 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d4',
    category: 'daily',
    authorName: '다이어트 탄탈로스',
    authorAvatar: '탄',
    content: '눈앞에 탐스러운 과일과 시원한 물이 가득합니다. 그런데 손을 뻗으면 과일은 물러나고 물은 빠져나갑니다. 영원히 배고프고 목마른 역대급 다이어트 챌린지 중입니다. 이것이 제 의지가 아니라는 게 유일한 위안입니다. 🧪',
    tags: ['다이어트폭망', '일상폭망'],
    createdAt: '어제',
    reactions: { '👑': 12, '🏺': 9, '🧪': 16, '🕯️': 7 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d5',
    category: 'daily',
    authorName: '지각대장 헤르메스',
    authorAvatar: '헤',
    content: '신들의 전령이자 스피드의 상징인 제가, 정작 중요한 전언 배달마다 늦잠을 잡니다. 날개 달린 샌들의 충전을 자꾸 깜빡하기 때문이죠. 빠른 발보다 중요한 건 알람이라는 걸 매일 깨닫습니다. 🕯️',
    tags: ['지각인생', '일상폭망'],
    createdAt: '어제',
    reactions: { '👑': 14, '🏺': 11, '🧪': 8, '🕯️': 13 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d6',
    category: 'daily',
    authorName: '금주 실패 디오니소스',
    authorAvatar: '주',
    content: '건강을 위해 야심 차게 금주를 선언했습니다. 술의 신으로서 스스로 모범을 보이려 했죠. 선언 세 시간 만에 포도밭을 습격한 제 모습을 발견했습니다. 직업이 곧 유혹인 자의 숙명입니다. 🏺',
    tags: ['금주실패', '일상폭망'],
    createdAt: '2일 전',
    reactions: { '👑': 16, '🏺': 22, '🧪': 6, '🕯️': 9 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d7',
    category: 'daily',
    authorName: '프로필 불일치 아프로디테',
    authorAvatar: '프',
    content: '미의 여신이라는 완벽한 프로필로 소개팅에 나갔습니다. 외모 점수는 만점이었죠. 다만 대화 주제가 서로 30분간 겉돌았고, 취향은 단 하나도 겹치지 않았습니다. 스펙과 케미는 완전히 별개의 항목이었습니다. 🕯️',
    tags: ['연애폭망', '인간관계', '소개팅망함'],
    createdAt: '3일 전',
    reactions: { '👑': 20, '🏺': 17, '🧪': 10, '🕯️': 12 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d8',
    category: 'daily',
    authorName: '요리 참사 키르케',
    authorAvatar: '키',
    content: '손님을 돼지로 만드는 변신 마법은 완벽하게 구사합니다. 그런데 정작 그 손님에게 대접할 스튜는 매번 새까맣게 태웁니다. 고급 마법과 기본 요리는 전혀 다른 영역이었죠. 오늘도 조용히 배달 음식을 시킵니다. 🧪',
    tags: ['요리참사', '일상폭망'],
    createdAt: '3일 전',
    reactions: { '👑': 13, '🏺': 10, '🧪': 19, '🕯️': 8 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d9',
    category: 'daily',
    authorName: '길치 오디세우스',
    authorAvatar: '오',
    content: '트로이에서 집까지, 남들은 며칠이면 갈 뱃길을 무려 10년에 걸쳐 돌아왔습니다. 세이렌이니 키클롭스니 핑계는 많았지만 본질은 지독한 길치였죠. 인류 최악의 내비게이션 사용 후기로 남았습니다. 🏺',
    tags: ['길치인생', '일상폭망', '지각인생'],
    createdAt: '4일 전',
    reactions: { '👑': 30, '🏺': 25, '🧪': 9, '🕯️': 11 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d10',
    category: 'daily',
    authorName: '입 가벼운 판도라',
    authorAvatar: '판',
    content: '절대 열지 말라던 상자를 호기심에 그만 열어버렸습니다. 세상 모든 근심과 소문이 순식간에 새어 나갔죠. 비밀 유지 서약서에 서명한 지 하루 만의 일이었습니다. 입 가벼운 자에게 상자를 맡긴 쪽도 잘못입니다. 🕯️',
    tags: ['인간관계', '비밀누설', '일상폭망'],
    createdAt: '5일 전',
    reactions: { '👑': 18, '🏺': 14, '🧪': 7, '🕯️': 16 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d11',
    category: 'daily',
    authorName: '갓생 실패 헤라클레스',
    authorAvatar: '라',
    content: '열두 가지 불가능한 과업을 모두 완수한 최강의 영웅입니다. 그런데 과업을 하나 끝낼 때마다 할 일 목록은 오히려 늘어났습니다. 사자를 잡아도, 히드라를 베어도 갓생은 완성되지 않았죠. 자기 계발의 끝은 없다는 걸 몸으로 증명했습니다. 🧪',
    tags: ['번아웃', '일상폭망', '갓생실패'],
    createdAt: '6일 전',
    reactions: { '👑': 26, '🏺': 13, '🧪': 20, '🕯️': 10 },
    myReactions: [],
    seed: true,
  },
  {
    id: 'post-d12',
    category: 'daily',
    authorName: '남 얘기만 하는 이솝',
    authorAvatar: '솝',
    content: '평생 남들에게 교훈을 주는 우화를 지어 들려주었습니다. 여우와 신 포도, 토끼와 거북이까지 명작이 넘쳐났죠. 그러나 정작 제 인생의 교훈은 하나도 챙기지 못했습니다. 조언은 늘 남의 것일 때 가장 쉽습니다. 🏺',
    tags: ['인간관계', '일상폭망', '오지랖'],
    createdAt: '1주 전',
    reactions: { '👑': 15, '🏺': 12, '🧪': 8, '🕯️': 9 },
    myReactions: [],
    seed: true,
  },
];

let currentUser = {
  name: '낙제생 플라톤',
  avatar: 'P',
  bio: '동굴 속에 갇혀서 이데아만 찾다가 현실 시험은 낙제해버린 아카데미아 수장입니다. 🏛️',
  joinedDate: '아카데미아 1일차 가입',
  gemsFound: 3,
};

// postId -> array of comment objects (separate from posts)
let comments = {
  'post-1': [
    {
      id: 'c-1-1',
      authorName: '이성장',
      avatar: '이',
      content: '정말 멋진 생각이에요! 특히 다듬어지지 않은 원석이라는 비유가 가슴에 와닿네요. 💎',
      time: '10분 전',
    },
    {
      id: 'c-1-2',
      authorName: '박디자인',
      avatar: '박',
      content: '토스 디자인 시스템 느낌의 UI가 완벽하게 재현되네요! 깔끔합니다.',
      time: '5분 전',
    },
  ],
  'post-m1': [
    {
      id: 'c-m1-1',
      authorName: '침착한 다이달로스',
      avatar: '다',
      content: '아들아, 그러게 중간 고도로 날라고 했잖니. 그래도 도전 정신 하나는 국보급이었다. 🕯️',
      time: '2시간 전',
    },
    {
      id: 'c-m1-2',
      authorName: '냉철한 QA',
      avatar: 'Q',
      content: '발열 테스트만 했어도 막을 수 있었던 사고입니다. 다음 스프린트에 꼭 반영합시다.',
      time: '1시간 전',
    },
  ],
  'post-m7': [
    {
      id: 'c-m7-1',
      authorName: '경계 선 카산드라',
      avatar: '카',
      content: '분명 열지 말라고 경고했는데 아무도 안 들었죠. 제 예언 정확도는 언제나 100%입니다.',
      time: '5일 전',
    },
  ],
  'post-d1': [
    {
      id: 'c-d1-1',
      authorName: '분주한 알렉산더',
      avatar: '알',
      content: '그때는 좀 서운했지만, 돌이켜보면 제가 들은 가장 멋진 대답이었습니다. 존경합니다.',
      time: '40분 전',
    },
  ],
  'post-d3': [
    {
      id: 'c-d3-1',
      authorName: '배고픈 탄탈로스',
      avatar: '탄',
      content: '황금 빵이라니… 저랑 처지가 비슷하시네요. 우리 같이 굶읍시다. 🏺',
      time: '2시간 전',
    },
  ],
};

const SEED_POSTS = JSON.parse(JSON.stringify(posts));
const SEED_COMMENTS = JSON.parse(JSON.stringify(comments));
const SEED_USER = JSON.parse(JSON.stringify(currentUser));

let isHydrated = false;
const listeners = new Set();

const prefixes = ['낙방한', '유급한', '낙제생', '탈락한', '유배당한', '독배마신'];
const suffixes = ['소크라테스', '플라톤', '아리스토텔레스', '피타고라스', '유클리드', '디오게네스'];

function getRandomNickname() {
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${p} ${s}`;
}

async function persist() {
  if (!isHydrated) return;
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ posts, comments, currentUser })
    );
  } catch (e) {
    console.error('[data.js] Failed to persist store to AsyncStorage:', e);
  }
}

async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.posts) posts = saved.posts;
      if (saved.comments) comments = saved.comments;
      if (saved.currentUser) currentUser = saved.currentUser;
    }
  } catch (e) {
    console.error('[data.js] Failed to hydrate store from AsyncStorage, falling back to defaults:', e);
  } finally {
    isHydrated = true;
    store.notify();
    persist();
  }
}

hydrate();

export const store = {
  isHydrated() {
    return isHydrated;
  },

  getPosts(category) {
    return category ? posts.filter(p => p.category === category) : [...posts];
  },

  getPost(id) {
    return posts.find(p => p.id === id);
  },

  getCurrentUser() {
    return { ...currentUser };
  },

  updateCurrentUser(updated) {
    currentUser = { ...currentUser, ...updated };
    this.notify();
    persist();
  },

  randomizeNickname() {
    currentUser = { ...currentUser, name: getRandomNickname() };
    this.notify();
    persist();
  },

  resetAllData() {
    posts = JSON.parse(JSON.stringify(SEED_POSTS));
    comments = JSON.parse(JSON.stringify(SEED_COMMENTS));
    currentUser = JSON.parse(JSON.stringify(SEED_USER));
    this.notify();
    persist();
  },

  addPost(content, tags, category = 'daily') {
    const newPost = {
      id: `post-${Date.now()}`,
      category,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content,
      tags,
      createdAt: '방금 전',
      reactions: { '👑': 0, '🏺': 0, '🧪': 0, '🕯️': 0 },
      myReactions: [],
    };
    posts = [newPost, ...posts];
    currentUser.gemsFound += 1;
    this.notify();
    persist();
  },

  reactToPost(postId, emoji) {
    posts = posts.map(post => {
      if (post.id === postId) {
        const myReactions = post.myReactions || [];
        const alreadyReacted = myReactions.includes(emoji);
        const count = post.reactions[emoji] || 0;
        const nextReactions = {
          ...post.reactions,
          [emoji]: alreadyReacted ? Math.max(0, count - 1) : count + 1,
        };
        const nextMyReactions = alreadyReacted
          ? myReactions.filter(e => e !== emoji)
          : [...myReactions, emoji];
        return { ...post, reactions: nextReactions, myReactions: nextMyReactions };
      }
      return post;
    });
    this.notify();
    persist();
  },

  getComments(postId) {
    return comments[postId] ? [...comments[postId]] : [];
  },

  addComment(postId, content) {
    const user = this.getCurrentUser();
    const newComment = {
      id: `c-${postId}-${Date.now()}`,
      authorName: user.name,
      avatar: user.avatar,
      content,
      time: '방금 전',
    };
    comments = {
      ...comments,
      [postId]: [...(comments[postId] || []), newComment],
    };
    this.notify();
    persist();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notify() {
    listeners.forEach(l => l());
  },
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

export function useHydrated() {
  return useStoreState(() => store.isHydrated());
}
