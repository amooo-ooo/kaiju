/** @satisfies {import('@webcontainer/api').FileSystemTree} */

import packages from '$lib/webcontainer/package.json?raw';
import git from '$lib/webcontainer/git.js?raw';

/*
export const files = {
    'index.js': {
      file: {
        contents: `
import express from 'express';
const app = express();
const port = 3111;
  
app.get('/', (req, res) => {
    res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>WebContainer App</title></head><body><h1>Welcome to a WebContainers app! 🥳</h1></body></html>');
});
  
app.listen(port, () => {
    console.log(\`App is live at http://localhost:\${port}\`);
});`,
      },
    },
    'package.json': {
        file: {
            contents: `
          {
            "name": "example-app",
            "type": "module",
            "dependencies": {
              "express": "latest",
              "nodemon": "latest"
            },
            "scripts": {
              "start": "nodemon index.js"
            }
          }`,
        },
    },
};
*/

export const files = {
  'package.json': {
    file: {
      contents: packages,
    },
  },
  'git.js': {
    file: {
      contents: git,
    },
  }
};
