<script lang="ts">
	interface Props {
		terminalElement?: HTMLDivElement | null;
	}

	let { terminalElement = $bindable(null) }: Props = $props();
</script>

<div class="terminal" bind:this={terminalElement}></div>

<style>
	.terminal {
		flex: 1;
		overflow: hidden;
	}
</style>
