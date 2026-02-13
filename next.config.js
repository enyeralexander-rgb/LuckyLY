/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

// Cargar .env y .env.local desde la raíz del proyecto (donde está next.config.js)
// para que el servidor lea las variables aunque next dev se ejecute desde otro cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.local") });

const nextConfig = {
  // Solo usar standalone en producción explícitamente (evitar en desarrollo)
  // output: "standalone" puede causar problemas de resolución de módulos en desarrollo
  ...(process.env.NODE_ENV === "production" && process.env.ENABLE_STANDALONE === "true" 
    ? { output: "standalone" } 
    : {}),

  // Headers de seguridad + Cache-Control (cache busting)
  async headers() {
    return [
      // Seguridad global
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // HTML pages — nunca cachear (siempre pedir al servidor)
      {
        source: "/((?!_next/static|_next/image|api|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      // Static assets — inmutable (ya tienen hash en nombre de archivo)
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // API routes — nunca cachear
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      // Imágenes estáticas — cachear 1 día
      {
        source: "/_next/image/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
    ];
  },

  // Configuración de webpack para mejorar la estabilidad y evitar errores de resolución
  webpack: (config, { dev, isServer, webpack }) => {
    // Agregar plugin de Prisma para incluir binarios en el bundle
    if (isServer) {
      config.plugins = [...(config.plugins || []), new PrismaPlugin()];
    }
    
    // Mejorar la resolución de módulos
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
    
    // Mejorar la resolución de módulos para evitar errores de chunks faltantes
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    
    // Ignorar warnings de módulos faltantes en desarrollo (son temporales durante HMR)
    if (dev) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        { module: /\.next\/server\/webpack-runtime\.js/ },
        { message: /Cannot find module/ },
        { message: /__webpack_modules__/ },
        { message: /Cannot read properties of undefined/ },
      ];
      
      // Mejorar el manejo de errores en desarrollo
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
      };
    }
    
    return config;
  },
  
  // Configuración experimental para mejorar la estabilidad
  experimental: {
    // Mejorar la estabilidad del bundling
    optimizePackageImports: ['@prisma/client'],
  },
};

export default nextConfig;

