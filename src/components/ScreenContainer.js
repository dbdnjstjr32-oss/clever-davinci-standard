import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 🏛️ 아카데미아 아틀리에 3D 공간 디스플레이 & 입체 모션 엔진 (Academia Atelier 3D Depth Engine)
 * 
 * PPT 스타일의 단순 선형 이동을 벗어나, 미술관 갤러리의 3D 조각품이 전진/후퇴하는 듯한
 * 고품격 패럴랙스(Parallax) & 3D 공간 스케일 트랜지션을 제공합니다.
 */
export default function ScreenContainer({ style, children, preset = 'gallery' }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 650, // 0.65초 럭셔리 타임라인
      easing: Easing.bezier(0.16, 1, 0.3, 1), // Apple / Toss 시그니처 베지어 이징
      useNativeDriver: false,
    }).start();
  }, [anim]);

  // 1. Gallery Preset: 3D 조각 갤러리 전진 모션 (Spatial Zoom + Rise)
  const galleryScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.07, 1],
  });
  const galleryY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  // 2. Portal Preset: 학문적 아카이브 차원 게이트 전진 모션
  const portalScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.91, 1],
  });
  const portalRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1.5deg', '0deg'],
  });

  // 3. Modal Preset: 브라스 명판 모달 입체 릴리즈
  const modalY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [90, 0],
  });
  const modalScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  const opacity = anim;

  let animStyle = {};

  if (preset === 'portal') {
    animStyle = {
      opacity,
      transform: [
        { scale: portalScale },
        { rotate: portalRotate },
      ],
    };
  } else if (preset === 'modal') {
    animStyle = {
      opacity,
      transform: [
        { translateY: modalY },
        { scale: modalScale },
      ],
    };
  } else {
    // Default: 'gallery' 3D 입체 갤러리 전환
    animStyle = {
      opacity,
      transform: [
        { scale: galleryScale },
        { translateY: galleryY },
      ],
    };
  }

  const ContainerComponent = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <ContainerComponent style={[styles.base, style]}>
      <Animated.View style={[styles.base, animStyle]}>
        {children}
      </Animated.View>
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: '#120E08',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
});
