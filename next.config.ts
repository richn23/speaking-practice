import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
  
  // Webpack config kept for compatibility
  webpack: (config, { isServer }) => {
    // Don't bundle ffmpeg-wasm on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@ffmpeg/ffmpeg": "commonjs @ffmpeg/ffmpeg",
        "@ffmpeg/util": "commonjs @ffmpeg/util",
      });
    }
    
    // Handle .wasm files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

export default nextConfig;
