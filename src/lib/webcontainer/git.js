const fs = require('fs');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const https = require('https');

const command = process.argv[2];
const argsJson = process.argv[3];

if (!command || !argsJson) {
  console.error('Error: Missing command or arguments from process.argv');
  process.exit(1);
}

const httpsAgent = new https.Agent({
  timeout: 32000, // 32 seconds
});

const customHttpClient = {
  request: async (args) => {
    args.agent = httpsAgent;
    return http.request(args);
  }
};

async function main() {
  try {
    const args = JSON.parse(argsJson);
    await git[command]({
      fs,
      http: customHttpClient,
      corsProxy: 'https://cors.isomorphic-git.org',
      ...args
    });

  } catch (err) {
    console.error(`\n`, err);
    process.exit(1);
  }
}

main();