import { After, Block, FuncCall, JumpTo, MoreStuff, Quote, Return, StringLiteral, Tuple, Underscore, Value, VarName } from "./core.ts";

declare const Deno: {
    readTextFileSync: (name: string) => string,
};

import * as peggy from 'peggy';
const grammar = Deno.readTextFileSync("parser.pegjs");
// @ts-expect-error
const parser = peggy.default.generate(grammar);

type Parsed = { pattern: string[], template: string[], next: Parsed[] };

export function readBlocksFromStr(raw_knx: string): Map<string, Block> {
    const asdf: Parsed[] = parser.parse(raw_knx);

    const blocks = new Map<string, Block>();
    for (const { pattern, template, next } of asdf) {
        const [block_name, ...block_args] = pattern;
        blocks.set(block_name, new Block(block_args, asdf_to_after(template, next)))
    }

    return blocks;
}

function toValue(x: string): Value {
    if (x[0] === '#') return new StringLiteral(x.slice(1));
    return new VarName(x);
}

function toSingleValue(x: string | string[]): Value {
    if (typeof x === "string") {
        return toValue(x);
    } else {
        if (x.length === 0) throw new Error("bad");
        if (x.length === 1) return toValue(x[0]);
        return new Tuple(x.map(toValue));
    }
}

function asdf_to_after(main_template: string[], main_next: Parsed[]): After {
    const [fn_name, ...args] = main_template;
    const next_after = main_next.map(({ pattern, template, next }) => {
        return {
            pattern: toSingleValue(pattern),
            after: asdf_to_after(template, next),
        };
    });
    switch (fn_name) {
        case 'ret':
            if (main_next.length > 0) throw new Error('bad');
            return new Return(toSingleValue(args));
        case 'quote':
            return new MoreStuff(new Quote(toSingleValue(args)), next_after);
        default:
            return new MoreStuff(new FuncCall(fn_name, args.map(toValue)), next_after);
    }
}