import type { Terminal } from '@xterm/xterm';

import { KaijuContainer } from '$lib/kaiju.js';
import { Git } from '$lib/git';

import { files } from '../../routes/files.js';

class WebContainerStore {
	container = $state<KaijuContainer | null>(null);
	terminal = $state<Terminal | null>(null);
	git = $state<Git | null>(null);
	dir = $state<string>('/');
	iframeSrc = $state('');

	async boot(): Promise<void> {
		if (this.container) return;

		this.container = await KaijuContainer.boot();
		if (this.terminal) {
			this.container.setTerminal(this.terminal);
		}
		this.terminal?.write('WebContainer booted.\r\n');

		await this.container.mount(files);

		this.dir = (await this.container.run('pwd')).stdout.trim();

		await this.container.run('ls', ['-la']);

		// Install Webcontainer dependencies
		await this.container.run('npm', ['install']);

		// Initialize Git
		this.git = new Git(this.container, 'git.js');

		this.terminal?.write('Creating repo directory...\r\n');
		await this.container.run('mkdir', ['repo']);

		this.terminal?.write(`Cloning template into ${this.dir}/repo...\r\n`);
		await this.git.clone({
			url: 'https://github.com/arthelokyo/astrowind',
			dir: './repo'
		});

		await this.container.run('ls', ['-la'], { cwd: './repo' });

		// Install project dependencies inside the cloned repository
		this.terminal?.write('Installing project dependencies...\r\n');
		await this.container.run('npm', ['install'], { cwd: './repo' });
		// Start dev server from repo directory
		await this.container.run('npm', ['run', 'dev'], { cwd: './repo' });

		// Listen for the server to be ready
		this.container.on('server-ready', (port, url) => {
			console.log(`Server is ready at port ${port}: ${url}`);
			this.iframeSrc = url;
		});
	}
}

export const webcontainerStore = new WebContainerStore();
