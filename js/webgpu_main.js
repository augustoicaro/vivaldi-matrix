const getCanvasSize = (canvas) => {
	const devicePixelRatio = window.devicePixelRatio ?? 1;
	return [canvas.clientWidth * devicePixelRatio, canvas.clientHeight * devicePixelRatio];
};

export default async (canvas, config) => {
	console.log(config);

	if (navigator.gpu == null) {
		return;
	}

	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter.requestDevice();
	const canvasContext = canvas.getContext("webgpu");
	const presentationFormat = canvasContext.getPreferredFormat(adapter);
	const queue = device.queue;

	const canvasConfig = {
		device,
		format: presentationFormat,
		size: getCanvasSize(canvas),
	};

	canvasContext.configure(canvasConfig);

	const renderPassConfig = {
		colorAttachments: [
			{
				view: canvasContext.getCurrentTexture().createView(),
				loadValue: { r: 0, g: 0, b: 0, a: 1 },
				storeOp: "store",
			},
		],
	};

	// TODO: create buffers, uniforms, textures, samplers

	// TODO: create pipelines, bind groups, shaders

	const bundleEncoder = device.createRenderBundleEncoder({
		colorFormats: [presentationFormat],
	});
	// TODO: create render bundle(s)
	const bundle = bundleEncoder.finish();
	const renderBundles = [bundle];

	const frame = (now) => {
		const canvasSize = getCanvasSize(canvas);
		if (canvasSize[0] !== canvasConfig.size[0] || canvasSize[1] !== canvasConfig.size[1]) {
			canvasConfig.size = canvasSize;
			canvasContext.configure(canvasConfig);

			// TODO: destroy and recreate all screen size textures

			// TODO: update camera matrix, screen size, write to queue
		}

		// TODO: update the uniforms that change, write to queue

		renderPassConfig.colorAttachments[0].loadValue.g = Math.sin((now / 1000) * 2) / 2 + 0.5;
		renderPassConfig.colorAttachments[0].view = canvasContext.getCurrentTexture().createView();

		const encoder = device.createCommandEncoder();
		const renderPass = encoder.beginRenderPass(renderPassConfig);
		renderPass.executeBundles(renderBundles);
		renderPass.endPass();
		const commandBuffer = encoder.finish();
		queue.submit([commandBuffer]);

		requestAnimationFrame(frame);
	};

	requestAnimationFrame(frame);
};

document.body.onload = () => {
	if (navigator.gpu != null) {
		initWebGPU();
	} else {
		// TODO: init regl
	}
};
