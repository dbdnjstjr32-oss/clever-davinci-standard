import React from 'react';
import { View, Platform, Image, StyleSheet } from 'react-native';
import { BLACKSMITH_PNG_BASE64 } from '../assets/blacksmithBase64';

/**
 * 🔨 대장장이 학자 (Blacksmith Scholar) - 메이커 피드 상단 마스코트.
 * 크로마키(초록배경) 제거 + SVG 노이즈 필터 애니메이션은 DoroScholar와 동일한 방식.
 */
export default function BlacksmithScholar({
  width = 200,
  height = 137,
  filterScale = 7,
  dur = '0.6s',
  style,
}) {
  if (Platform.OS === 'web') {
    const filterId = `blacksmithTurbulenceFilter_${Math.random().toString(36).substring(2, 9)}`;

    return (
      <View style={[styles.container, { width, height }, style]}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 640 439"
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
            href={BLACKSMITH_PNG_BASE64}
            filter={`url(#${filterId})`}
            width="640"
            height="439"
          />
        </svg>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={{ uri: BLACKSMITH_PNG_BASE64 }}
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
