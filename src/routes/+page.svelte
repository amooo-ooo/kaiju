<script lang="ts">
	import { onMount } from 'svelte';

	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import TerminalPanel from '$lib/components/TerminalPanel.svelte';
	import PreviewPanel from '$lib/components/PreviewPanel.svelte';

	import { webcontainerStore } from '$lib/stores/webcontainer.svelte';

	let terminalElement = $state<HTMLDivElement | null>(null);
	let textareaContent = $state('');

	async function handleTextareaInput(content: string) {
		textareaContent = content;
		if (webcontainerStore.container) {
			await webcontainerStore.container.fs.writeFile('/git.js', content);
		}
	}

	onMount(async () => {
		const { Terminal } = await import('@xterm/xterm');
		await import('@xterm/xterm/css/xterm.css');

		const terminal = new Terminal({ convertEol: true });
		if (terminalElement) {
			terminal.open(terminalElement);
		}

		webcontainerStore.terminal = terminal;
		terminal.write('Booting WebContainer...\r\n');

		await webcontainerStore.boot();

		// Load initial content
		if (webcontainerStore.container) {
			const content = await webcontainerStore.container.fs.readFile('/git.js', 'utf-8');
			textareaContent = content;
		}
	});
</script>

<div class="container">
	<div class="content">
		<div class="editor">
			<CodeEditor content={textareaContent} onInput={handleTextareaInput} />
			<TerminalPanel bind:terminalElement />
		</div>
		<PreviewPanel iframeSrc={webcontainerStore.iframeSrc} />
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
	}

	.content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.editor {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
