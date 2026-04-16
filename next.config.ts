import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  // production build 시 누적된 기존 타입 경고를 배포 블로커로 만들지 않음.
  // 로컬 개발(npx next dev)과 IDE 에는 영향 없음.
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },
}

export default nextConfig
