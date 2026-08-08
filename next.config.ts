import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { webpack }) => {
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@coinbase/cdp-sdk",
      "@metamask/connect-evm",
      "porto",
      "@walletconnect/ethereum-provider"
    );
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@phosphor-icons\/webcomponents\/(.*)$/,
        (resource: any) => {
          resource.request = "data:text/javascript,export default {}";
        }
      ),
      new webpack.IgnorePlugin({
        resourceRegExp: /^accounts$/,
      })
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      "@coinbase/cdp-sdk": false,
      accounts: false,
      "@metamask/connect-evm": false,
      porto: false,
      "@walletconnect/ethereum-provider": false,
    };
    return config;
  },
};

export default nextConfig;









