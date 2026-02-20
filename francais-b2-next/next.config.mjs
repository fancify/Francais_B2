/** @type {import('next').NextConfig} */
const nextConfig = {
  // Amplify 环境变量仅在 build 阶段可用，Lambda 运行时 process.env 为空。
  // env 配置让 Next.js 在 build 时把值内联进 bundle（DefinePlugin）。
  // OPENROUTER_API_KEY 只在 server-only 代码中引用，不会泄露到客户端 bundle。
  env: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
};

export default nextConfig;
