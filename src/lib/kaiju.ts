import { WebContainer } from '@webcontainer/api';
import type { BootOptions, SpawnOptions, WebContainerProcess } from '@webcontainer/api';
import type { Terminal } from '@xterm/xterm';

import astroConfigTemplate from '$lib/inspector/astro.config.mjs?raw';
import inspectorPlugin from '$lib/inspector/inspector-plugin.ts?raw';
import inspectorComponent from '$lib/inspector/inspector.js?raw';
import inspectorStyles from '$lib/inspector/styles.css?raw';

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

	async mountInspector(path: string): Promise<void> {
		await this.fs.mkdir(`${path}/.kaiju`, { recursive: true });

		// ensure file exists
		const files = {
			'inspector.js': inspectorComponent,
			'inspector.css': inspectorStyles,
			'index.ts': inspectorPlugin,
			'astro.config.mjs': astroConfigTemplate	
		};

		for (const [filename, content] of Object.entries(files)) {
			const filePath = `${path}/.kaiju/${filename}`;
			await this.fs.readFile(filePath, 'utf-8').catch(async () =>
				await this.fs.writeFile(filePath, content, { encoding: 'utf-8' }));
		}

		let config = await this.fs.readFile(`${path}/.kaiju/astro.config.mjs`, 'utf-8');
		// don't duplicate inspector
		if (config.includes('KaijuInspector')) {
			return;
		}

		// inject import statement
		const importRegex = /(import.*?from 'astro\/config';)/;
		config = config.replace(importRegex,
			`$1\nimport { KaijuInspector } from './inspector-plugin';`
		);

		// add inspector to integrations array.
		const integrationsRegex = /integrations:\s*\[(.*?)\]/s;
		config = config.replace(
			integrationsRegex,
			(match, existingIntegrations) => {
				// strip comments and whitespace
				const strippedContent = existingIntegrations
					.replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
					.replace(/\/\/.*/g, '') // remove single-line comments
					.trim();

				if (strippedContent) return `integrations: [KaijuInspector(), ${existingIntegrations}]`;
				return `integrations: [KaijuInspector()]`;
			}
		);

    	await this.fs.writeFile(`${path}/.kaiju/astro.config.mjs`, config, { encoding: 'utf-8' });	
	}

	static override async boot(options?: BootOptions): Promise<KaijuContainer> {
		const containerInstance = await super.boot(options);
		const kaijuContainer = new KaijuContainer();
		Object.assign(kaijuContainer, containerInstance);
		return kaijuContainer;
	}
}
