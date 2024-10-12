import { After, Block, FuncCall, JumpTo, MoreStuff, Quote, Return, StringLiteral, Tuple, Underscore, Value, VarName } from "./core.ts";

declare const Deno: {
    readTextFileSync: (name: string) => string,
};

import * as peggy from 'peggy';
const grammar = Deno.readTextFileSync("parser.pegjs");
// @ts-expect-error
const parser = peggy.default.generate(grammar);

type ParsedSexpr = string | ParsedSexpr[];
type Parsed = { pattern: ParsedSexpr, template: ParsedSexpr, next: Parsed[] };

export function readValueFromStr(sexpr: string): Value {
    // TODO: less hacky
    const asdf: Parsed[] = parser.parse(sexpr + ' -> _;');
    return toValue(single(asdf).pattern);
}

export function readBlocksFromStr(raw_knx: string): Map<string, Block> {
    const asdf: Parsed[] = parser.parse(raw_knx);

    const blocks = new Map<string, Block>();
    for (const { pattern, template, next } of asdf) {
        const [block_name, ...block_args] = pattern;
        blocks.set(ensureAtom(block_name), new Block(block_args.map(ensureAtom), asdf_to_after(template, next)))
    }

    return blocks;
}

function ensureAtom(x: ParsedSexpr): string {
    if (typeof x === 'string') {
        return x;
    }
    throw new Error("bad");
}

function toValue(x: ParsedSexpr): Value {
    if (typeof x === "string") {
        if (x === '_') return new Underscore();
        if (x[0] === '#') return new StringLiteral(x.slice(1));
        return new VarName(x);
    } else {
        return new Tuple(x.map(toValue));
    }
}

function asdf_to_after(main_template: ParsedSexpr, main_next: Parsed[]): After {
    const [fn_name, ...args] = main_template;
    const next_after = main_next.map(({ pattern, template, next }) => {
        return {
            pattern: toValue(pattern),
            after: asdf_to_after(template, next),
        };
    });
    switch (fn_name) {
        case 'ret':
            if (main_next.length > 0) throw new Error('bad');
            return new Return(toValue(single(args)));
        case 'quote':
            return new MoreStuff(new Quote(toValue(single(args))), next_after);
        default:
            return new MoreStuff(new FuncCall(ensureAtom(fn_name), args.map(toValue)), next_after);
    }
}

function single<T>(thing: T[]): T {
    if (thing.length !== 1) throw new Error("bad");
    return thing[0];
}
