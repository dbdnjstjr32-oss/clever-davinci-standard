import React from 'react';
import { View, Platform, Image, StyleSheet } from 'react-native';
import { THINKER_PNG_BASE64 } from '../assets/thinkerBase64';

/**
 * 🏛️ 아카데미아 생각하는 학자 (Thinker Scholar)
 * 크로마키(초록배경)가 깔끔하게 제거된 고뇌하는 철학자 지혜 마스코트 컴포넌트
 */
export default function ThinkerScholar({
  width = 140,
  height = 178,
  filterScale = 7,
  dur = '0.6s',
  style,
}) {
  if (Platform.OS === 'web') {
    const filterId = `thinkerTurbulenceFilter_${Math.random().toString(36).substring(2, 9)}`;

    return (
      <View style={[styles.container, { width, height }, style]}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 422 537"
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
            href={THINKER_PNG_BASE64}
            filter={`url(#${filterId})`}
            width="422"
            height="537"
          />
        </svg>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={{ uri: THINKER_PNG_BASE64 }}
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
