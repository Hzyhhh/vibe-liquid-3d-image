import html2canvas from "html2canvas";

async function saveWithBlur(
	selector: string,
	subEl: CanvasImageSource,
	blurRadius = 10,
) {
	const el = document.querySelector(selector);
	const baseCanvas = await html2canvas(el as HTMLElement);
	const w = baseCanvas.width,
		h = baseCanvas.height;
	const out = document.createElement("canvas");
	out.width = w;
	out.height = h;
	const ctx = out.getContext("2d")!;

	ctx.filter = `blur(${blurRadius}px)`;
	ctx.drawImage(baseCanvas, 0, 0);
	ctx.drawImage(subEl, 1, 1);

	console.log("subEl", subEl);

	const dataUrl = out.toDataURL("image/png");
	const link = document.createElement("a");
	link.download = "screenshot.png";
	link.href = dataUrl;
	link.click();
}

export { saveWithBlur };
