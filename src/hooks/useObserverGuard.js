import { store } from '../data';
import { confirmDialog } from '../utils/alert';

/**
 * 👁️ 관찰자 모드 권한 가드 (Observer Permission Guard)
 * 읽기 권한만 부여하며, 공감 / 글작성 / 댓글작성 / 프로필 열람 시 토스 로그인 유도 모달을 띄웁니다.
 */
export function checkObserverGuard(navigation, actionType, onProceed) {
  if (store.isObserver()) {
    const messages = {
      react: '관찰자 모드에서는 공감(리액션)을 남길 수 없습니다.',
      write: '관찰자 모드에서는 글을 작성할 수 없습니다.',
      comment: '관찰자 모드에서는 댓글을 남길 수 없습니다.',
      profile: '관찰자 모드에서는 프로필을 열람할 수 없습니다.',
    };
    const reason = messages[actionType] || '관찰자 모드에서는 읽기만 가능합니다.';

    confirmDialog(
      '관찰자 모드 (읽기 전용)',
      `${reason}\n토스로 입장하고 참여해보세요!`,
      '토스로 입장',
      () => {
        store.exitObserver();
        navigation.navigate('Auth');
      }
    );
    return false;
  }

  if (onProceed) onProceed();
  return true;
}
