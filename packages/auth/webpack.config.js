const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

// Parse host .env file
const dotenvPath = path.resolve(__dirname, '../host/.env');
const env = {};
if (fs.existsSync(dotenvPath)) {
  const content = fs.readFileSync(dotenvPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value;
    }
  });
}

module.exports = {
  entry: './src/index.ts',
  output: { publicPath: process.env.PUBLIC_PATH || 'http://localhost:3001/', clean: true },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  devServer: { port: 3001, historyApiFallback: true, headers: { 'Access-Control-Allow-Origin': '*' } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: 'ts-loader' }, { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] }] },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.COGNITO_DOMAIN': JSON.stringify(process.env.COGNITO_DOMAIN || env.COGNITO_DOMAIN || ''),
      'process.env.COGNITO_REGION': JSON.stringify(process.env.COGNITO_REGION || env.COGNITO_REGION || ''),
      'process.env.COGNITO_USER_POOL_ID': JSON.stringify(process.env.COGNITO_USER_POOL_ID || env.COGNITO_USER_POOL_ID || ''),
      'process.env.COGNITO_CLIENT_ID': JSON.stringify(process.env.COGNITO_CLIENT_ID || env.COGNITO_CLIENT_ID || ''),
      'process.env.API_URL': JSON.stringify(process.env.API_URL || env.API_URL || ''),
    }),
    new ModuleFederationPlugin({
      name: 'auth',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App' },
      shared: { react: { singleton: true, requiredVersion: false }, 'react-dom': { singleton: true, requiredVersion: false } }
    }),
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'public/index.html') })
  ]
};
