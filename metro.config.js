const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 앱인토스 출시 요건: eval() 금지
// Metro 기본 asyncRequireModulePath를 require.resolveWeak으로 대체하여
// fetchThenEvalAsync(eval 사용)가 번들에 포함되지 않도록 합니다.
config.transformer = {
  ...config.transformer,
  asyncRequireModulePath: require.resolve('metro-runtime/src/modules/asyncRequire'),
};

module.exports = config;
