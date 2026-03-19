/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // MetaMask SDK (pulled in by some wallet connectors) references a React Native async storage module.
    // For web builds we can safely shim it to an empty module to avoid noisy build warnings.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
}

export default nextConfig
