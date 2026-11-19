import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'xiangchao-miniapp',
    date: '2026-11-18',
    designWidth: 375,
    deviceRatio: {
      375: 2,
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: process.env.TARO_ENV === 'h5' ? 'dist-h5' : 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      // lucide's barrel export includes a reserved `Infinity` name and breaks Taro's prebundle parser.
      prebundle: { exclude: ['lucide'] },
    },
    cache: {
      enable: false,
    },
    mini: {
      webpackChain(chain) {
        // Taro provides global requestAnimationFrame from @tarojs/runtime, which makes
        // the runtime's own raf.js import itself and throw a TDZ error at startup.
        chain.plugin('providerPlugin').tap((args) => {
          delete args[0].requestAnimationFrame
          delete args[0].cancelAnimationFrame
          return args
        })
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
