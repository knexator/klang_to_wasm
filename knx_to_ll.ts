import { After, Block, FuncCall, JumpTo, MoreStuff, Quote, Return, StringLiteral, Tuple, Underscore, Value, VarName } from "./core.ts";

declare const Deno: {
    readTextFileSync: (name: string) => string,
    writeTextFileSync: (name: string, contents: string) => void,
    args: string[],
};

import * as peggy from 'peggy';
const grammar = Deno.readTextFileSync("parser.pegjs");
// @ts-expect-error
const parser = peggy.default.generate(grammar);

const raw_knx = Deno.readTextFileSync(Deno.args[0]);
type Parsed = { pattern: string[], template: string[], next: Parsed[] };
const asdf: Parsed[] = parser.parse(raw_knx);

console.log(asdf);

const blocks = new Map<string, Block>();
for (const { pattern, template, next } of asdf) {
    const [block_name, ...block_args] = pattern;
    blocks.set(block_name, new Block(block_args, asdf_to_after(template, next)))
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


// assumes the block is already ANF
function block_to_llvm(block_name: string, b: Block): string {
    // todo: allow different return type
    const args_string = b.input_variables.map(n => {
        const [type, name] = to_llvm_name_and_type(n);
        return `${type} %${name}`;
    }).join(', ');
    let code = `define i32 @${block_name}(${args_string}) {`
    code += after_to_llvm(b.body);
    code += '\n\notherwise:\n';
    code += '   unreachable\n';
    code += '}\n';
    return code;
}

function to_llvm_name_and_type(n: string): ['float' | 'i32', string] {
    const [typ, name, ...extra] = n.split(':');
    if (extra.length > 0) throw new Error("bad name");
    if (typ === 'f') return ['float', name];
    if (typ === 'i') return ['i32', name];
    throw new Error("bad type");
}

function after_to_llvm(asdf: After): string {
    if (asdf instanceof Return) {
        if (asdf.value instanceof Tuple) throw new Error("bad return");
        if (asdf.value instanceof Underscore) return 'ret void';
        if (asdf.value instanceof StringLiteral) {
            const [type, name] = to_llvm_name_and_type(asdf.value.value);
            return `ret ${type} ${name}`;
        }
        if (asdf.value instanceof VarName) {
            const [type, name] = to_llvm_name_and_type(asdf.value.name);
            return `ret ${type} %${name}`;
        }
        const _: never = asdf.value;
        throw new Error("unreachable");
    } else if (asdf instanceof MoreStuff) {
        if (asdf.expression instanceof Quote) {
            if (!(asdf.expression.value instanceof VarName)) throw new Error("bad quote");
            const [type, name] = to_llvm_name_and_type(asdf.expression.value.name);
            if (asdf.after.length > 2) {
                const stuff = asdf.after.map(({ pattern, after }) => {
                    if (!(pattern instanceof StringLiteral)) throw new Error("not done");
                    const [pattern_type, pattern_value] = to_llvm_name_and_type(pattern.value);
                    const block_name = makeBlockName();
                    const block_contents = `${block_name}:
                    ${after_to_llvm(after)}`;
                    const switch_text = `${pattern_type} ${pattern_value}, label %${block_name}`;
                    return { block_contents, switch_text };
                })
                return `switch ${type} %${name}, label %otherwise [${stuff.map(({ switch_text }) => switch_text).join('\n\t')}]
                ${stuff.map(({ block_contents }) => block_contents).join('\n')}`
            } else {
                throw new Error("notdone");
            }
        } else if (asdf.expression instanceof FuncCall) {
            if (asdf.after.length !== 1) throw new Error('notdone');
            const next_var = asdf.after[0].pattern;
            const next_asdfasdf = asdf.after[0].after;
            if (!(next_var instanceof VarName)) throw new Error("not done");
            const [next_var_type, next_var_name] = to_llvm_name_and_type(next_var.name);
            let expr: string;

            switch (asdf.expression.func_name) {
                case 'fmul': {
                    const [arg_0, arg_1, ...extra] = asdf.expression.args;
                    if (extra.length > 0) throw new Error("bad");
                    expr = `fmul ${toLlvmArg(arg_0)}, ${toLlvmArg(arg_1)}`
                    break;
                }
                case 'fptosi': {
                    const [arg_0, ...extra] = asdf.expression.args;
                    if (extra.length > 0) throw new Error("bad");
                    expr = `fptosi ${toLlvmArg(arg_0)} to i32`
                    break;
                }

                default:
                    throw new Error(`func not done: ${asdf.expression.func_name}`);
            }
            return `%${next_var_name} = ${expr}\n` + after_to_llvm(next_asdfasdf);
            // const fn_name = asdf.expression.func_name;
            // const fn_args = asdf.expression.args;
            // const afters = asdf.after;
            // return normalize_values(fn_args, args => {
            //     const new_afters = afters.map(({ pattern, after }) => {
            //         return { pattern, after: normalize_after(after) };
            //     })
            //     return new MoreStuff(new FuncCall(fn_name, args), new_afters);
            // });
        } else {
            const _: never = asdf.expression;
            throw new Error("unreachable");
        }
    } else if (asdf instanceof JumpTo) {
        throw new Error("notdone");
        // return normalize_values(asdf.args, vs => new JumpTo(asdf.block_name, vs));
    } else {
        const _: never = asdf;
        throw new Error();
    }
}

let block_counter = -1;
function makeBlockName(): string {
    block_counter += 1;
    return `block_${block_counter}`;
}

const code = new Block(['f:x', 'f:y', 'i:channel'], new MoreStuff(
    new Quote(new VarName('i:channel')), [{
        pattern: new StringLiteral('i:0'),
        after: new Return(new StringLiteral('i:255')),
    }, {
        pattern: new StringLiteral('i:1'),
        after: new Return(new StringLiteral('i:128')),
    }, {
        pattern: new StringLiteral('i:2'),
        after: new Return(new StringLiteral('i:0')),
    }],
));

const expected_llvm = `
define i32 @getPixel(float %x, float %y, i32 %channel) {
  switch i32 %channel, label %otherwise [ i32 0, label %red
                                          i32 1, label %green
                                          i32 2, label %blue ]

red:
  %asdf = fmul float %x, 255.0
  %asdf.2 = fptosi float %asdf to i32
  ret i32 %asdf.2
green:
  ret i32 128
blue:
  ret i32 0

otherwise:
  unreachable
}`;

console.log(code.print());
console.log(block_to_llvm("xxx", code));
console.log(expected_llvm);

Deno.writeTextFileSync("llvm.ll", '\n@memory = external global i8, align 1' +
    mapMap(blocks, (block_name, block) => block_to_llvm(block_name, block)).join('\n\n'));

function mapMap<K, V, T>(map: Map<K, V>, c: (key: K, val: V) => T): T[] {
    const result: T[] = [];
    for (const [key, value] of map) {
        result.push(c(key, value));
    }
    return result;
}

function toLlvmArg(arg: Value): string {
    if (arg instanceof Underscore || arg instanceof Tuple) throw new Error("bad");
    if (arg instanceof VarName) {
        const [t, n] = to_llvm_name_and_type(arg.name);
        return `${t} %${n}`;
    }
    if (arg instanceof StringLiteral) {
        let [t, n] = to_llvm_name_and_type(arg.value);
        if (t === 'float' && !n.includes('.')) n = n + '.0';
        return n;
    }
    const _: never = arg;
    throw new Error("unreachable");
}
