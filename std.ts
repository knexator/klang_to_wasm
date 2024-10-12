export function eqArrays<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    for (let k = 0; k < a.length; k++) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}

export function eqArrays2<T>(a: T[], b: T[], areEq: (x: T, y: T) => boolean): boolean {
    if (a.length !== b.length) return false;
    for (let k = 0; k < a.length; k++) {
        if (!areEq(a[k], b[k])) return false;
    }
    return true;
}
