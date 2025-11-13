import { WebContainer } from '@webcontainer/api';
import type { SpawnOptions, WebContainerProcess } from '@webcontainer/api';
import type { Terminal } from '@xterm/xterm';

interface RunOptions extends SpawnOptions {
	alias?: string;
	concurrent?: boolean;
}

interface KaijuContainerProcess extends WebContainerProcess {
	stdout: string;
}

export class KaijuContainer extends WebContainer {
	private terminal: Terminal | null = null;

	setTerminal(terminal: Terminal) {
		this.terminal = terminal;
	}

	async run(
		cmd: string,
		args: string[] = [],
		{ cwd, env, output = true, terminal, alias, concurrent = false }: RunOptions = {}
	): Promise<KaijuContainerProcess> {
		const process = await this.spawn(cmd, args, { cwd, env, output, terminal });
		let stdout = '';
		if (output) {
			this.terminal?.write(alias ? `\n$ ${alias}` : `\n$ ${cmd} ${args.join(' ')}\r\n`);
			process.output.pipeTo(
				new WritableStream({
					write: (data) => {
						this.terminal?.write(data);
						stdout += data;
					}
				})
			);
		}
		if (!concurrent && (await process.exit)) throw new Error(stdout);
		return { ...process, stdout };
	}

	static override async boot(): Promise<KaijuContainer> {
		const containerInstance = await super.boot();
		const kaijuContainer = new KaijuContainer();
		Object.assign(kaijuContainer, containerInstance);
		return kaijuContainer;
	}
}
