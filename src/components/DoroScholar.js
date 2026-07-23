import React from 'react';
import { View, Platform, Image, StyleSheet } from 'react-native';
import { DORO_PNG_BASE64 } from '../assets/doroBase64';

/**
 * 🏛️ 아카데미아 학자 (Doro Scholar) - 크로마키 제거 및 SVG 노이즈 필터 애니메이션 컴포넌트
 * 
 * 사용자가 제공한 SVG feTurbulence + feDisplacementMap + seed 애니메이션 필터를
 * 크로마키(초록배경)가 제거된 학자 캐릭터에 적용합니다.
 */
export default function DoroScholar({
  width = 240,
  height = 131,
  filterScale = 7,
  dur = '0.6s',
  style,
}) {
  if (Platform.OS === 'web') {
    const filterId = `doroTurbulenceFilter_${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <View style={[styles.container, { width, height }, style]}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1024 559"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.12"
                numOctaves="1"
                seed="1"
                result="noise"
              >
                <animate
                  attributeName="seed"
                  values="1;2;3;4;5"
                  dur={dur}
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={filterScale} />
            </filter>
          </defs>
          <image
            href={DORO_PNG_BASE64}
            filter={`url(#${filterId})`}
            width="1024"
            height="559"
          />
        </svg>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={{ uri: DORO_PNG_BASE64 }}
        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
