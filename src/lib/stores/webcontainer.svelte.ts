import { WebContainer } from '@webcontainer/api';
import type { WebContainer as WebContainerType } from '@webcontainer/api';
import type { Terminal } from '@xterm/xterm';
import { files } from '../../routes/files.js';

class WebContainerStore {
	container = $state<WebContainerType | null>(null);
	terminal = $state<Terminal | null>(null);
	iframeSrc = $state('');

	async boot(): Promise<void> {
		if (this.container) return;
		
		this.container = await WebContainer.boot();
		
		// Mount files
		await this.container.mount(files);
		
		// Install dependencies
		const installProcess = await this.container.spawn('npm', ['install']);
		installProcess.output.pipeTo(
			new WritableStream({
				write: (data) => this.terminal?.write(data)
			})
		);
		await installProcess.exit;
		
		// Start dev server
		await this.container.spawn('npm', ['start']);
		
		// Setup server listener
		this.container.on('server-ready', (port, url) => {
			this.iframeSrc = url;
		});
	}
}

export const webcontainerStore = new WebContainerStore();
