export const KaijuInspector = () => ({
  name: 'kaiju-inspector',
  hooks: {
    'astro:config:setup': ({ command, injectScript }) => {
      if (command === 'dev') {
        injectScript('page', `import '/.kaiju/inspector.js';`);
      }
    },
  },
});