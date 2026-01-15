/** @type {import('next').NextConfig} */
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');

const nextConfig = {
  // Solo usar standalone en producción explícitamente (evitar en desarrollo)
  // output: "standalone" puede causar problemas de resolución de módulos en desarrollo
  ...(process.env.NODE_ENV === "production" && process.env.ENABLE_STANDALONE === "true" 
    ? { output: "standalone" } 
    : {}),
  
  // Configuración de webpack para mejorar la estabilidad y evitar errores de resolución
  webpack: (config, { dev, isServer, webpack }) => {
    // Agregar plugin de Prisma para incluir binarios en el bundle
    if (isServer) {
      config.plugins = [...(config.plugins || []), new PrismaPlugin()];
    }
    // Mejorar la resolución de módulos en desarrollo
    if (dev) {
      // Asegurar que los módulos se resuelvan correctamente
      if (!config.resolve) {
        config.resolve = {};
      }
      // Deshabilitar symlinks para mejorar la resolución de módulos
      config.resolve.symlinks = false;
      
      // Mejorar la estabilidad del code splitting
      if (!config.optimization) {
        config.optimization = {};
      }
      
      // Configurar chunks más estables para evitar referencias rotas
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Prevenir errores de chunks faltantes
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
      
      // Mejorar el manejo de errores de módulos faltantes
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ignorar warnings de módulos faltantes en desarrollo (son temporales durante HMR)
    if (dev && config.ignoreWarnings) {
      config.ignoreWarnings = [
        ...config.ignoreWarnings,
        { module: /\.next\/server\/webpack-runtime\.js/ },
        { message: /Cannot find module/ },
      ];
    } else if (dev) {
      config.ignoreWarnings = [
        { module: /\.next\/server\/webpack-runtime\.js/ },
        { message: /Cannot find module/ },
      ];
    }
    
    return config;
  },
  
  // Configuración experimental para mejorar la estabilidad
  experimental: {
    // Mejorar la estabilidad del bundling
    optimizePackageImports: ['@prisma/client'],
  },
};

module.exports = nextConfig;

