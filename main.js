const canvas_ctx = document.querySelector("#ctx_canvas");
const ctx = canvas_ctx.getContext("2d");

const scale = 0.25;
canvas_ctx.width = Math.floor(canvas_ctx.clientWidth * scale);
canvas_ctx.height = Math.floor(canvas_ctx.clientHeight * scale);

const asdf = await WebAssembly.instantiateStreaming(fetch("handmade.wasm"));
const wasm_exports = asdf.instance.exports;

// const bytes = new Uint8Array(wasm_exports.memory.buffer, 0, 10);

const PIXEL_SIZE = 1;
for (let j = 0; j < canvas_ctx.height; j += PIXEL_SIZE) {
    for (let i = 0; i < canvas_ctx.width; i += PIXEL_SIZE) {
        const r = wasm_exports.getPixel(i / canvas_ctx.width, j / canvas_ctx.height, 0);
        const g = wasm_exports.getPixel(i / canvas_ctx.width, j / canvas_ctx.height, 1);
        const b = wasm_exports.getPixel(i / canvas_ctx.width, j / canvas_ctx.height, 2);
        ctx.fillStyle = rgbToHex(r,g,b);
        ctx.fillRect(i, j, PIXEL_SIZE, PIXEL_SIZE);
    }
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(num => {
        const hex = num.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}
