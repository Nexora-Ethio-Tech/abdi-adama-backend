import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // Build configuration
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        // Generate source maps for debugging
        sourcemap: false,
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // Manual chunk splitting for better caching
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                            return 'react-vendor';
                        }
                        if (id.includes('framer-motion') || id.includes('lucide-react')) {
                            return 'ui-vendor';
                        }
                        if (id.includes('zustand')) {
                            return 'state-vendor';
                        }
                        if (id.includes('i18next') || id.includes('react-i18next')) {
                            return 'i18n-vendor';
                        }
                    }
                },
                // Ensure consistent asset naming
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name?.split('.') || [];
                    const ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        return `assets/images/[name]-[hash][extname]`;
                    } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
                        return `assets/fonts/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js'
            }
        }
    },

    // Server configuration for development
    server: {
        port: 5173,
        host: true,
        strictPort: false,
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    },

    // Preview server configuration
    preview: {
        port: 4173,
        host: true,
        strictPort: false
    },

    // Path resolution
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@context': path.resolve(__dirname, './src/context'),
            '@assets': path.resolve(__dirname, './src/assets')
        }
    },

    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'framer-motion']
    },

    // Base path - set to './' for relative paths (important for deployment)
    base: './'
});
