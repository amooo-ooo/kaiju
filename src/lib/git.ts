import type { KaijuContainer } from './kaiju';

export class Git {
  #webcontainer: KaijuContainer;
  #path: string;

  [key: string]: (args: Record<string, unknown>) => Promise<any>;

  constructor(
    webcontainerInstance: KaijuContainer,
    path: string = 'git.js'
  ) {
    if (!webcontainerInstance) {
      throw new Error('A WebContainer instance must be provided to the Git constructor.');
    }
    this.#webcontainer = webcontainerInstance;
    this.#path = path;

    this.smartClone = this.smartClone.bind(this);

    return new Proxy(this, {
      get(target, command: string | symbol) {
        // Skip symbols and internal properties
        if (typeof command === 'symbol' || command.startsWith('_')) {
          return target[command as keyof Git];
        }
        if (command in target) {
          return target[command as keyof Git];
        }
        return (args: Record<string, unknown> = {}) => target.#run(command, args);
      },
    });
  }

  async smartClone({ url, dir }: { url: string; dir?: string }): Promise<void> {
    const urlRegex = /^(https?:\/\/[^\/]+\/[^\/]+\/[^\/]+?)(?:\.git)?(?:\/tree\/[^\/]+\/(.*))?$/;
    const match = url.match(urlRegex);

    if (!match) throw new Error(`Invalid or unsupported Git URL format: ${url}`);
    const repoUrl = match[1]; // e.g., "https://github.com/withastro/astro"
    const subdirectory = match[2]; // e.g., "examples/with-tailwindcss" or undefined

    // git clone 
    if (!subdirectory) { 
      await this.#run('clone', { url, dir }); 
      return;
    };

    // git sparse clone
    await this.#run('clone', {
      dir,
      url: repoUrl,
      noCheckout: true, // needed for sparse checkout
      singleBranch: true,
      depth: 1, // fetch only the latest commit
    });

    await this.#run('checkout', {
      dir,
      filepaths: [subdirectory], // folder to check out
    });

    console.log("cool")
    // move contents of subdirectory to root
    await this.#webcontainer.run('sh', ['-c', `cd "${dir}" && mv ${subdirectory}/* ${subdirectory}/.* . 2>/dev/null || true && rm -rf ${subdirectory}`]);
  }

  async #run(command: string | symbol, args: Record<string, unknown>): Promise<any> {
    const argsString = Object.entries(args)
      .filter(([key]) => key !== 'corsProxy')
      .map(([, value]) => String(value))
      .join(' ');

    // TODO: properly handle timeout
    return this.#webcontainer.run('node', [
      this.#path,
      String(command),
      JSON.stringify(args)
    ], { alias: `git ${String(command)} ${argsString}` });
  }
}
