import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // 저장 중 잠깐 비워진 파일이 모듈 변환 결과로 캐시되지 않게 한다.
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 25 },
    },
  },
})
