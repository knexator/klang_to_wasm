@echo off
if "%1"=="" (
    echo Usage: %0 filename.zig
    exit /b 1
)

set ZIG_FILE=%1
set BASENAME=%~n1

:: Compile the Zig file to WebAssembly
zig build-exe %ZIG_FILE% -target wasm32-freestanding -fno-entry -rdynamic -O ReleaseSmall

:: Convert the WebAssembly to WAT (WebAssembly Text format)
wasm2wat %BASENAME%.wasm

:: Cleanup
del %BASENAME%.wasm %BASENAME%.wasm.o
