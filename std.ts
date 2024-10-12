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
export function combineMaps<K, V>(...maps: Map<K, V>[]): Map<K, V> {
    const result = new Map<K, V>();

    for (const map of maps) {
        for (const [key, value] of map) {
            result.set(key, value);
        }
    }

    return result;
}

export function get<K, V>(map: Map<K, V>, key: K): V {
    const res = map.get(key);
    if (res === undefined) {
        throw new Error(`Could not find key '${key}' in map with keys '${Array(...map.keys())}'`);
    }
    return res;
}

export function mapValues<K, V, T>(map: Map<K, V>, c: (key: K, val: V) => T): Map<K, T> {
    const result = new Map<K, T>();
    for (const [key, value] of map) {
        result.set(key, c(key, value));
    }
    return result;
}

export function mapFilterValues<K, V, T>(map: Map<K, V>, c: (key: K, val: V) => T | null): Map<K, T> {
    const result = new Map<K, T>();
    for (const [key, value] of map) {
        const v = c(key, value);
        if (v !== null) result.set(key, v);
    }
    return result;
}

export function zipToMap<K, V>(list_of_keys: K[], list_of_values: V[]): Map<K, V> {
    if (list_of_keys.length !== list_of_values.length) {
        throw new Error("The lists of keys and values must have the same length");
    }

    const result = new Map<K, V>();
    for (let i = 0; i < list_of_keys.length; i++) {
        result.set(list_of_keys[i], list_of_values[i]);
    }
    return result;
}

export function ensure<T>(x: T | null | undefined): T {
    if (x === null || x === undefined) throw new Error();
    return x;
}

