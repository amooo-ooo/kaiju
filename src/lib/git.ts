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
