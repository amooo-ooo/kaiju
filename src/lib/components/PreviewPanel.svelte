<script lang="ts">
	interface Props {
		iframeSrc: string;
	}

	let { iframeSrc }: Props = $props();
</script>

<div class="preview">
	<iframe src={iframeSrc} title="WebContainer Preview"></iframe>
</div>

<style>
	.preview {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	iframe {
		flex: 1;
		width: 100%;
		border: 1px solid #ccc;
		border-left: none;
	}
</style>
