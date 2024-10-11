pub fn main() !void {
    return;
}

export fn getPixelOld(x: f32, y: f32, c: i32) i32 {
    _ = x; // autofix
    _ = y; // autofix
    if (c == 0) {
        return 255;
    } else if (c == 1) {
        return 128;
    } else if (c == 2) {
        return 123;
    } else {
        return 0;
    }
}

pub export fn getPixel(x: f32, y: f32, c: i32) i32 {
    _ = y; // autofix
    if (c == 0) {
        return @intFromFloat(x * 255.0);
    } else if (c == 1) {
        return 128;
    } else if (c == 2) {
        return 0;
    } else {
        return 0;
    }
}
