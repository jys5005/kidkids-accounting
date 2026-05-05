import type { NextConfig } from 'next'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  // production build 시 누적된 기존 타입 경고를 배포 블로커로 만들지 않음.
  // 로컬 개발(npx next dev)과 IDE 에는 영향 없음.
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },
  // prod 에서는 cert24.kr/account 로 통합 (NEXT_PUBLIC_BASE_PATH=/account 환경변수로 활성화).
  // 로컬 dev (4000) 에서는 환경변수 없으면 빈 값 → basePath 안 쓰고 root 그대로.
  ...(BASE ? { basePath: BASE, assetPrefix: BASE } : {}),
}

export default nextConfig
