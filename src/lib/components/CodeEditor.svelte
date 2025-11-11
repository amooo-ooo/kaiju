<script lang="ts">
	interface Props {
		content: string;
		onInput: (content: string) => void;
	}

	let { content, onInput }: Props = $props();

	function handleInput(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		onInput(target.value);
	}
</script>

<textarea value={content} oninput={handleInput}></textarea>

<style>
	textarea {
		flex: 1;
		width: 100%;
		padding: 1rem;
		font-family: monospace;
		font-size: 14px;
		border: 1px solid #ccc;
		resize: none;
	}
</style>
