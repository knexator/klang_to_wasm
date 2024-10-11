dev:
	python -m http.server

.PHONY: x
x: handmade.wasm

handmade.wasm: handmade.wat
	wat2wasm handmade.wat

llvm.ll: code.knx knx_to_ll.ts
	deno run --allow-write --allow-read ./knx_to_ll.ts code.knx

llvm.wasm: llvm.ll
	clang -target wasm32 -nostdlib -o llvm.wasm llvm.ll -Wl,--no-entry,--export-all,--allow-undefined -Wno-override-module
