import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버에서도 배포와 동일하게 /api/generate 를 태우기 위한 미들웨어.
// (Vite dev 서버는 Vercel 서버리스 함수를 실행하지 않는다)
const apiDevServer = (): Plugin => ({
  name: 'api-dev-server',
  configureServer(server) {
    server.middlewares.use('/api/generate', async (req, res) => {
      try {
        const mod = await server.ssrLoadModule('/api/generate.ts');
        await mod.default(req, res);
      } catch (err) {
        server.config.logger.error(`[api/generate] ${err}`);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Dev API handler failed.' }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // API 키는 서버 전용이다. 클라이언트 번들에 절대 주입하지 않는다.
  // dev 미들웨어 핸들러가 읽을 수 있도록 .env.local 값만 process.env로 넘긴다.
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), apiDevServer()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
