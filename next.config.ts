import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding", "@coinbase/cdp-sdk");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@phosphor-icons\/webcomponents\/(.*)$/,
        (resource: any) => {
          resource.request = "data:text/javascript,export default {}";
        }
      )
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      "@coinbase/cdp-sdk": false,
    };
    return config;
  },
};

export default nextConfig;







