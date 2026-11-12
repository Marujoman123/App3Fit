const { defineConfig } = require('cypress');

// Precisa do site servido em http://localhost:5500 a partir da raiz do projeto (Live Server)
module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5500',
    video: false,
    defaultCommandTimeout: 10000,
  },
});
