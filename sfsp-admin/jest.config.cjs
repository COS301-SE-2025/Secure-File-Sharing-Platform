// jest.config.cjs
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': 'jest-transform-stub',
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'mjs', 'cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  // Only include .jsx if necessary; .js is inferred from "type": "module"
  extensionsToTreatAsEsm: ['.jsx'],
};