'use strict'
const path = require('path')
const utils = require('./utils')
const config = require('../config')
const vueLoaderConfig = require('./vue-loader.conf')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

const isProd = process.env.NODE_ENV === 'production'

const transpileDependencies = [
  resolve('src'),
  resolve('test'),
  resolve('node_modules/pickleparser'),
  resolve('node_modules/element-plus'),
  resolve('node_modules/vue-virtual-scroller'),
  resolve('node_modules/@ctrl'),
  resolve('node_modules/@vueuse'),
  resolve('node_modules/lodash-unified')
]

module.exports = {
  mode: isProd ? 'production' : 'development',
  context: path.resolve(__dirname, '../'),
  entry: {
    app: './src/main.js'
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: isProd
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath
  },
  target: 'electron-renderer',
  resolve: {
    extensions: ['.mjs', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js',
      'element-plus$': 'element-plus/lib/index.js',
      'vue-i18n$': isProd
        ? 'vue-i18n/dist/vue-i18n.esm-browser.prod.js'
        : 'vue-i18n/dist/vue-i18n.esm-browser.js',
      '@ctrl/tinycolor$': '@ctrl/tinycolor/dist/public_api.js',
      'lodash-unified$': 'lodash-unified/require.cjs',
      '@vueuse/core$': '@vueuse/core/index.cjs',
      '@vueuse/shared$': '@vueuse/shared/index.cjs',
      '@': resolve('src'),
    }
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
        options: {
          // map sourceMap
          name(resourcePath, resourceQuery) {
            if (!isProd) {
              return "[path][name].[ext]";
            }

            return "[contenthash].[ext]";
          },
        },
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig,
        // include: [
        //   resolve('src'), resolve('test'),
        //   // resolve('node_modules/@qii404/vue-easy-tree/src/')
        // ],
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      },
      {
        test: /\.m?js$/,
        loader: 'babel-loader',
        include: transpileDependencies
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('media/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('fonts/[name].[hash:7].[ext]'),
          // this is vital important for fonts loads, added before 'static/fonts'
          publicPath: '../../'
        }
      },

    ]
  },
  node: {
    // prevent webpack from injecting useless setImmediate polyfill because Vue
    // source contains it (although only uses it if it's native).
    setImmediate: false,
    // prevent webpack from injecting mocks to Node native modules
    // that does not make sense for the client
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  }
}
