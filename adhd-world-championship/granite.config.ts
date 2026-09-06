import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에서 만든 appName과 반드시 동일하게 바꿔야 해.
  appName: 'adhd-world-championship',
  brand: {
    displayName: 'ADHD 세계선수권',
    primaryColor: '#B6FF39',
    // 출시 전 콘솔에 업로드한 실제 아이콘 URL로 교체해.
    icon: 'https://static.toss.im/appsintoss/73/1414e0f9-f3eb-4b56-a138-e3351502738d.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'game',
    overScrollMode: 'never',
  },
});
