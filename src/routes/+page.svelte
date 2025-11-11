<script lang="ts">
	import { onMount } from 'svelte';

	import { WebContainer } from '@webcontainer/api';
	import type { WebContainer as WebContainerType } from '@webcontainer/api';
	import type { Terminal } from '@xterm/xterm';

	import { files } from './files.js';

	let webcontainer = $state<WebContainerType | null>(null);
	let terminal = $state<Terminal | null>(null);
	let terminalElement = $state<HTMLDivElement | null>(null);
	let textareaContent = $state(files['index.js'].file.contents);
	let iframeSrc = $state('');
	let status = $state('Booting WebContainer...');

	async function installDependencies() {
		if (!webcontainer || !terminal) return -1;

		// Install dependencies
		status = 'Installing dependencies...';
		const installProcess = await webcontainer.spawn('npm', ['install']);
		installProcess.output.pipeTo(
			new WritableStream({
				write(data) {
					terminal?.write(data);
				}
			})
		);

		// Wait for install command to exit
		return installProcess.exit;
	}

	async function startDevServer() {
		if (!webcontainer || !terminal) return;

		// Run `npm run start` to start the Express app
		const serverProcess = await webcontainer.spawn('npm', ['run', 'start']);
		serverProcess.output.pipeTo(
			new WritableStream({
				write(data) {
					terminal?.write(data);
				}
			})
		);

		status = 'Starting server...';
		webcontainer.on('server-ready', (port, url) => {
			iframeSrc = url;
			status = '';
		});
	}

	async function writeIndexJS(content: string) {
		if (!webcontainer) return;
		await webcontainer.fs.writeFile('/index.js', content);
	}

	function handleTextareaInput(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		textareaContent = target.value;
		writeIndexJS(target.value);
	}

	onMount(async () => {
		const { Terminal } = await import('@xterm/xterm');
		await import('@xterm/xterm/css/xterm.css');

		webcontainer = await WebContainer.boot();
		await webcontainer.mount(files);

		terminal = new Terminal({ convertEol: true });
		if (terminalElement) {
			terminal.open(terminalElement);
		}

		const exitCode = await installDependencies();
		if (exitCode !== 0) {
			throw new Error('Installation failed');
		}

		startDevServer();
	});
</script>

<div class="container">
	<div class="editor">
		<textarea value={textareaContent} oninput={handleTextareaInput}></textarea>
		<div class="terminal" bind:this={terminalElement}></div>
	</div>
	<div class="preview">
		{#if status}
			<div class="status">{status}</div>
		{:else}
			<iframe src={iframeSrc} title="WebContainer Preview"></iframe>
		{/if}
	</div>
</div>

<style>
	.container {
		display: flex;
		height: 100vh;
		width: 100%;
	}

	.editor {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.preview {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	textarea {
		flex: 1;
		width: 100%;
		padding: 1rem;
		font-family: monospace;
		font-size: 14px;
		border: 1px solid #ccc;
		resize: none;
	}

	.terminal {
		flex: 1;
		overflow: hidden;
	}

	iframe {
		flex: 1;
		width: 100%;
		border: 1px solid #ccc;
		border-left: none;
	}

	.status {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f5f5f5;
		color: #666;
		font-size: 16px;
	}
</style>
