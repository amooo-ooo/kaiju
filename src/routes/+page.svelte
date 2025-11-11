<script lang="ts">
	import { onMount } from 'svelte';
	import { WebContainer } from '@webcontainer/api';
	import type { WebContainer as WebContainerType } from '@webcontainer/api';
	import { files } from './files.js';

	let webcontainerInstance = $state<WebContainerType | null>(null);
	let textareaContent = $state(files['index.js'].file.contents);
	let iframeSrc = $state('');
	let status = $state('Booting WebContainer...');

	async function installDependencies() {
		if (!webcontainerInstance) return -1;

        // Install dependencies
		status = 'Installing dependencies...';
		const installProcess = await webcontainerInstance.spawn('npm', ['install']);
		installProcess.output.pipeTo(new WritableStream({
			write(data) {
				console.log(data);
			}
		}));

        // Wait for install command to exit
		return installProcess.exit;
	}

	async function startDevServer() {
		if (!webcontainerInstance) return;

        // Run `npm run start` to start the Express app
		webcontainerInstance.spawn('npm', ['run', 'start']);

        // Wait for `server-ready` event
		status = 'Starting server...';
		webcontainerInstance.on('server-ready', (port, url) => {
			console.log('Server ready on port', port, 'at URL', url);
			iframeSrc = url;
			status = '';
		});
	}

	async function writeIndexJS(content: string) {
		if (!webcontainerInstance) return;
		await webcontainerInstance.fs.writeFile('/index.js', content);
	}

	function handleTextareaInput(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		textareaContent = target.value;
		writeIndexJS(target.value);
	}

	onMount(async () => {
		webcontainerInstance = await WebContainer.boot();
		await webcontainerInstance.mount(files);

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
