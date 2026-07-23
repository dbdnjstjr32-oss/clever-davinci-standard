import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'academia-atelier', // 앱인토스 콘솔에 등록한 appName과 동일해야 해요.
  brand: {
    displayName: '아카데미아 아틀리에', // 콘솔에 등록한 한국어 앱 이름
    primaryColor: '#C5A880', // src/theme.js의 colors.gold
    icon: 'https://static.toss.im/appsintoss/57005/760b6f95-7415-4c33-8065-51e63b766d6b.png',
  },
  web: {
    host: '0.0.0.0',
    port: 8082,
    commands: {
      dev: 'http-server dist -p 8082 -a 0.0.0.0 -c-1 --cors',
      build: 'expo export --platform web',
    },
  },
  permissions: [],
  outdir: 'dist',
});
