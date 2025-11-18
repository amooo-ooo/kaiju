/** @satisfies {import('@webcontainer/api').FileSystemTree} */

import packages from '$lib/container-image/package.json?raw';
import git from '$lib/container-image/git.js?raw';

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
