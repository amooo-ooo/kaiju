import type { Terminal } from '@xterm/xterm';

import { KaijuContainer } from '$lib/kaiju.js';
import { Git } from '$lib/git';

import { files } from '../../routes/files.js';

class WebContainerStore {
	container = $state<KaijuContainer | null>(null);
	terminal = $state<Terminal | null>(null);
	git = $state<Git | null>(null);
	iframeSrc = $state('');

	async boot(): Promise<void> {
		if (this.container) return;

		this.container = await KaijuContainer.boot({
			workdirName: 'kaiju'
		});
		if (this.terminal) {
			this.container.setTerminal(this.terminal);
		}
		this.terminal?.write('WebContainer booted.\r\n');

		await this.container.mount(files);

		await this.container.run('ls', ['-la']);

		// Install Webcontainer dependencies
		await this.container.run('pnpm', ['install']);

		// Initialize Git
		this.git = new Git(this.container, 'git.js');

		await this.container.run('mkdir', ['repo']);

		await this.git.smartClone({
			// url: 'https://github.com/arthelokyo/astrowind',
			// url: 'https://github.com/rahxd1/simple-vite-template-vanilla',
			// url: 'https://github.com/withastro/astro/tree/main/examples/with-tailwindcss',
			url: 'https://github.com/amooo-ooo/kaiju-starter',
			dir: './repo'
		});

		await this.container.run('ls', ['-la'], { cwd: './repo' });

		// Install project dependencies inside the cloned repository
		await this.container.run('pnpm', ['install'], { cwd: './repo' });
		
		// Listen for the server to be ready
		this.container.on('server-ready', (port, url) => {
			console.log(`Server is ready at port ${port}: ${url}`);
			this.iframeSrc = url;
		});

		// Start dev server from repo directory
		await this.container.run('pnpm', ['run', 'dev'], { cwd: './repo' });
	}
}

export const webcontainerStore = new WebContainerStore();
