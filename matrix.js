import { structs } from "./lib/gpu-buffer.js";
import { makeUniformBuffer, makePipeline } from "./js/webgpu/utils.js";
import { setupCamera, cameraCanvas, cameraAspectRatio, cameraSize } from "./js/camera.js";

import makeConfig from "./js/config.js";
import makeRain from "./js/webgpu/rainPass.js";
import makeBloomPass from "./js/webgpu/bloomPass.js";
import makePalettePass from "./js/webgpu/palettePass.js";
import makeStripePass from "./js/webgpu/stripePass.js";
import makeImagePass from "./js/webgpu/imagePass.js";
import makeMirrorPass from "./js/webgpu/mirrorPass.js";
import makeEndPass from "./js/webgpu/endPass.js";

document.body.onload = async () => {
  const loadJS = (src) =>
    new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.onload = resolve;
      tag.onerror = reject;
      tag.src = src;
      document.body.appendChild(tag);
    });
  await loadJS("lib/gl-matrix.js");

  let canvas = undefined;
  let inPage = false;
  let needUpdate = false;
  const config = makeConfig({});
  const effects = {
    none: null,
    plain: makePalettePass,
    palette: makePalettePass,
    customStripes: makeStripePass,
    stripes: makeStripePass,
    pride: makeStripePass,
    transPride: makeStripePass,
    trans: makeStripePass,
    image: makeImagePass,
    mirror: makeMirrorPass,
  };

  const entermatrix = async () => {
    if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
      window.ondblclick = () => {
        if (document.fullscreenElement == null) {
          if (canvas.webkitRequestFullscreen != null) {
            canvas.webkitRequestFullscreen();
          } else {
            canvas.requestFullscreen();
          }
        } else {
          document.exitFullscreen();
        }
      };
    }
  
    if (config.useCamera) {
      await setupCamera();
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvasContext = canvas.getContext("webgpu");

    console.table(device.limits);

    canvasContext.configure({
      device,
      format: canvasFormat,
      alphaMode: "opaque",
      usage:
        // GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
    });

    const timeUniforms = structs.from(`struct Time { seconds : f32, frames : i32, };`).Time;
    const timeBuffer = makeUniformBuffer(device, timeUniforms);
    const cameraTex = device.createTexture({
      size: cameraSize,
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const context = {
      config,
      adapter,
      device,
      canvasContext,
      timeBuffer,
      canvasFormat,
      cameraTex,
      cameraAspectRatio,
      cameraSize,
    };

    const effectName = config.effect in effects ? config.effect : "palette";
    const pipeline = await makePipeline(context, [makeRain, makeBloomPass, effects[effectName], makeEndPass]);

    const targetFrameTimeMilliseconds = 1000 / config.fps;
    let frames = 0;
    let start = NaN;
    let last = NaN;
    let outputs;

    const renderLoop = (now) => {
      if (isNaN(start)) {
        start = now;
      }

      if (isNaN(last)) {
        last = start;
      }

      const shouldRender = config.fps >= 60 || now - last >= targetFrameTimeMilliseconds || config.once;
      if (shouldRender) {
        while (now - targetFrameTimeMilliseconds > last) {
          last += targetFrameTimeMilliseconds;
        }
      }

      const devicePixelRatio = window.devicePixelRatio ?? 1;
      const canvasWidth = Math.ceil(canvas.clientWidth * devicePixelRatio * config.resolution);
      const canvasHeight = Math.ceil(canvas.clientHeight * devicePixelRatio * config.resolution);
      const canvasSize = [canvasWidth, canvasHeight];
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        outputs = pipeline.build(canvasSize);
      }

      if (config.useCamera) {
        device.queue.copyExternalImageToTexture({ source: cameraCanvas }, { texture: cameraTex }, cameraSize);
      }

      device.queue.writeBuffer(timeBuffer, 0, timeUniforms.toBuffer({ seconds: (now - start) / 1000, frames }));
      frames++;

      const encoder = device.createCommandEncoder();
      pipeline.run(encoder, shouldRender);
      // Eventually, when WebGPU allows it, we'll remove the endPass and just copy from our pipeline's output to the canvas texture.
      // encoder.copyTextureToTexture({ texture: outputs?.primary }, { texture: canvasContext.getCurrentTexture() }, canvasSize);
      device.queue.submit([encoder.finish()]);

      if (inPage) {
        requestAnimationFrame(renderLoop);
      } else {
        //TODO: Release resources
      }
    };

    requestAnimationFrame(renderLoop);
  }

  // Test if still in startpage
  setInterval(() => {
    var tab = document.getElementsByClassName("tab active")[0];
    var child = tab.childNodes[0];
    var cchild = child.childNodes[1];
    if( cchild.textContent!="Start Page" ){
      inPage = false;
      needUpdate = true;
    }
    else {
      inPage = true;
      if( needUpdate ) {
        canvas=document.getElementsByTagName("canvas")[0];
        entermatrix();
      }
      needUpdate = false;
    }
  }, 500);
  
  setTimeout(() => {
    canvas=document.getElementsByTagName("canvas")[0];
    entermatrix();
  }, 3000)
}
