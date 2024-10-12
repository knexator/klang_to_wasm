//// basic values

import { combineMaps, ensure, eqArrays, eqArrays2, get, mapFilterValues, mapValues, zipToMap } from "./std.ts";

export class VarName {
    constructor(
        public name: string,
    ) { }

    print(): string {
        return '@' + this.name;
    }

    isEqualTo(b: Value): boolean {
        if (!(b instanceof VarName)) return false;
        return this.name === b.name;
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): Value {
        const asdf = old_names_to_new_values.get(this.name);
        if (asdf !== undefined) return asdf;
        return this;
    }

    requiredVariables(): string[] {
        return [this.name];
    }
}

export class Underscore {
    print(): string {
        return '@_';
    }

    isEqualTo(b: Value): boolean {
        if (!(b instanceof Underscore)) return false;
        return true;
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): Value {
        return this;
    }

    requiredVariables(): string[] {
        return [];
    }
}

export class StringLiteral {
    constructor(
        public value: string,
    ) { }

    print(): string {
        return this.value;
    }

    isEqualTo(b: Value): boolean {
        if (!(b instanceof StringLiteral)) return false;
        return this.value === b.value;
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): Value {
        return this;
    }

    requiredVariables(): string[] {
        return [];
    }
}

export class Tuple {
    constructor(
        public values: Value[],
    ) { }

    print(): string {
        const innerValues = this.values.map(v => v.print()).join(', ');
        return `(${innerValues})`;
    }

    isEqualTo(b: Value): boolean {
        if (!(b instanceof Tuple)) return false;
        return eqArrays2(this.values, b.values, (x, y) => x.isEqualTo(y));
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): Value {
        return new Tuple(this.values.map(x => x.inlineValues(old_names_to_new_values)));
    }

    requiredVariables(): string[] {
        return this.values.flatMap(x => x.requiredVariables());
    }
}

export type Value = VarName | StringLiteral | Tuple | Underscore;

//// the 3 options after a thing: return, jump to join point, or keep executing

export class JumpTo {
    constructor(
        public block_name: string,
        public args: Value[],
    ) { }

    print(): string {
        const argsStr = this.args.map(x => x.print()).join(', ');
        return `JumpTo(${this.block_name}, [${argsStr}])`;
        // return `JumpTo(\n${indent(`${this.block_name},\n[\n${argsStr}\n]`, 1)}\n}`;
    }

    isEqualTo(b: After): boolean {
        if (!(b instanceof JumpTo)) return false;
        return this.block_name === b.block_name && eqArrays2(this.args, b.args, (x, y) => x.isEqualTo(y));
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): JumpTo {
        return new JumpTo(this.block_name, this.args.map(x => x.inlineValues(old_names_to_new_values)));
    }

    changeRetsToJumps(join_name: string, extra_input_names: string[]): JumpTo {
        return this;
    }

    changeJumpsToRets(obsolete_name: string, value_to_return: Value, input_names: string[]): Return | JumpTo {
        if (obsolete_name !== this.block_name) return this;
        return new Return(fillInVariables(value_to_return, zipToMap(input_names, this.args)));
    }

    requiredVariables(): string[] {
        return this.args.flatMap(x => x.requiredVariables());
    }

    removeValuesFromJumps(block_name: string, to_remove: number[]): JumpTo {
        if (this.block_name !== block_name) {
            return this;
        } else {
            return new JumpTo(block_name, this.args.filter((_, k) => !to_remove.includes(k)))
        }
    }

    changeJumpsTo(
        block_name_to_inline: string,
        original_inputs: string[],
        expression: Expression,
        stuff: { new_block_name: string, pattern: Value }[],
    ): After {
        if (block_name_to_inline !== this.block_name) return this;
        return new MoreStuff(
            expression.inlineValues(zipToMap(original_inputs, this.args)),
            stuff.map(({ new_block_name, pattern }) => {
                return {
                    pattern,
                    after: new JumpTo(new_block_name, [
                        ...(pattern.requiredVariables().map(x => new VarName(x))),
                        ...this.args])
                };
            })
        );
    }

    maybeInlineQuote(): JumpTo {
        return this;
    }
}

export class Return {
    constructor(
        public value: Value,
        // public values: Value[],
    ) { }

    print(): string {
        return `Return(${this.value.print()})`;
    }

    isEqualTo(b: After): boolean {
        if (!(b instanceof Return)) return false;
        return this.value.isEqualTo(b.value);
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): Return {
        return new Return(this.value.inlineValues(old_names_to_new_values));
    }

    changeRetsToJumps(join_name: string, extra_input_names: string[]): JumpTo {
        return new JumpTo(join_name, [this.value, ...extra_input_names.map(x => new VarName(x))]);
    }

    changeJumpsToRets(obsolete_name: string, value_to_return: Value, input_names: string[]): Return {
        return this;
    }

    requiredVariables(): string[] {
        return this.value.requiredVariables();
        // return this.args.flatMap(x => x.requiredVariables());
    }

    removeValuesFromJumps(block_name: string, to_remove: number[]): Return {
        return this;
    }

    maybeInlineQuote(): Return {
        return this;
    }
}

export type After = MoreStuff | Return | JumpTo;

export class MoreStuff {
    constructor(
        public expression: Expression,
        public after: { pattern: Value, after: After }[],
    ) { }

    print(): string {
        return `${this.expression.print()}: {\n${this.after.map(({ pattern, after }) => indent(`${pattern.print()} -> ${after.print()}`, 1)).join('\n')}\n}`;
    }

    isEqualTo(b: After): boolean {
        if (!(b instanceof MoreStuff)) return false;
        return this.expression.isEqualTo(b.expression) && eqArrays2(this.after, b.after, (x, y) => x.pattern.isEqualTo(y.pattern) && x.after.isEqualTo(y.after));
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): MoreStuff {
        return new MoreStuff(
            this.expression.inlineValues(old_names_to_new_values),
            this.after.map(({ pattern, after }) => {
                return { pattern, after: after.inlineValues(old_names_to_new_values) };
            }));
    }

    changeRetsToJumps(join_name: string, extra_input_names: string[]): MoreStuff {
        return new MoreStuff(
            this.expression,
            this.after.map(({ pattern, after }) => {
                return { pattern, after: after.changeRetsToJumps(join_name, extra_input_names) };
            }));
    }

    changeJumpsToRets(obsolete_name: string, value_to_return: Value, input_names: string[]): MoreStuff {
        return new MoreStuff(
            this.expression,
            this.after.map(({ pattern, after }) => {
                return { pattern, after: after.changeJumpsToRets(obsolete_name, value_to_return, input_names) };
            }));
    }

    requiredVariables(): string[] {
        return [
            ...this.expression.requiredVariables(),
            ...this.after.flatMap(({ pattern, after }) => {
                return after.requiredVariables().filter(x => !pattern.requiredVariables().includes(x));
            })
        ];
    }

    removeValuesFromJumps(block_name: string, to_remove: number[]): MoreStuff {
        return new MoreStuff(
            this.expression,
            this.after.map(({ pattern, after }) => {
                return { pattern, after: after.removeValuesFromJumps(block_name, to_remove) };
            }));
    }

    maybeInlineQuote(): After {
        let valid_afters = this.after;
        if (this.expression instanceof Quote) {
            const exp = this.expression;
            valid_afters = this.after.filter(({ pattern }) => {
                return findBindings(exp.value, pattern) !== null;
            });

            valid_afters = valid_afters.map(({ pattern, after }) => {
                const unused_pattern_vars = substract(pattern.requiredVariables(), after.requiredVariables());
                return {
                    pattern:
                        pattern.inlineValues(new Map(unused_pattern_vars.map(n => [n, new Underscore()]))), after
                };
            });

            if (valid_afters.length === 1) {
                const { pattern, after } = valid_afters[0];
                const bindings = findBindings(pattern, exp.value);
                if (bindings !== null) {
                    return after.inlineValues(bindings);
                }
            }
        }
        return new MoreStuff(this.expression, valid_afters.map(({ pattern, after }) => {
            return { pattern, after: after.maybeInlineQuote() };
        }));
    }

    inlineJumpsOneLevel(
        block_name_to_inline: string,
        original_inputs: string[],
        expression: Expression,
        stuff: { new_block_name: string, pattern: Value }[],
    ): MoreStuff {
        return new MoreStuff(
            this.expression,
            this.after.map(({ pattern, after }) => {
                if (after instanceof Return) {
                    return { pattern, after };
                } else if (after instanceof JumpTo) {
                    return {
                        pattern, after: after.changeJumpsTo(
                            block_name_to_inline,
                            original_inputs,
                            expression,
                            stuff,
                        )
                    };
                } else if (after instanceof MoreStuff) {
                    return {
                        pattern, after: after.inlineJumpsOneLevel(
                            block_name_to_inline,
                            original_inputs,
                            expression,
                            stuff,
                        )
                    };
                } else {
                    const _: never = after;
                    throw new Error();
                }
            })
        );
    }
}

//// main thing

export class Block {
    constructor(
        public input_variables: string[],
        public body: After,
    ) { }

    print(): string {
        const inputs = this.input_variables.join(', ');
        return `Block(\n${indent(`inputs: [${inputs}],\nbody: ${this.body.print()}`, 1)}\n${indent(')', 0)}`;
    }

    isEqualTo(b: Block) {
        return eqArrays(this.input_variables, b.input_variables) && this.body.isEqualTo(b.body);
    }
}

//// built in functions

export type Expression = Quote | FuncCall;

export class Quote {
    constructor(
        public value: Value,
    ) { }

    print(): string {
        return `Quote(${this.value.print()})`;
    }

    isEqualTo(b: Expression): boolean {
        if (!(b instanceof Quote)) return false;
        return this.value.isEqualTo(b.value);
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): Quote {
        return new Quote(this.value.inlineValues(old_names_to_new_values));
    }

    requiredVariables(): string[] {
        return this.value.requiredVariables();
    }
}

export class FuncCall {
    constructor(
        public func_name: string,
        public args: Value[],
    ) { }

    print(): string {
        const argsStr = this.args.map(x => x.print()).join(', ');
        return `FuncCall(${this.func_name}, [${argsStr}])`;
    }

    isEqualTo(b: Expression): boolean {
        if (!(b instanceof FuncCall)) return false;
        return this.func_name === b.func_name && eqArrays2(this.args, b.args, (x, y) => x.isEqualTo(y));
    }

    inlineValues(old_names_to_new_values: Map<string, Value>): FuncCall {
        return new FuncCall(this.func_name, this.args.map(x => x.inlineValues(old_names_to_new_values)));
    }

    requiredVariables(): string[] {
        return this.args.flatMap(x => x.requiredVariables());
    }
}

////////////

export function interpreter(
    all_blocks: Map<string, Block>,
    main_block_name: string,
    input_values: Value[],
    // input_values: Map<string, Value>,
): Value {
    const cur_block = ensure(all_blocks.get(main_block_name));
    const env = zipToMap(cur_block.input_variables, input_values);
    return afterHelper(all_blocks, cur_block.body, env);

    function afterHelper(
        all_blocks: Map<string, Block>,
        thing: After,
        env: Map<string, Value>,
    ): Value {
        if (thing instanceof Return) {
            return fillInVariables(thing.value, env);
        } else if (thing instanceof JumpTo) {
            return interpreter(all_blocks, thing.block_name, thing.args.map(x => fillInVariables(x, env)));
        } else if (thing instanceof MoreStuff) {
            let result: Value = resultFromExpression(thing.expression, env, all_blocks);
            for (const { pattern, after } of thing.after) {
                const bindings = findBindings(pattern, result);
                if (bindings === null) continue;
                env = combineMaps(env, bindings);
                return afterHelper(all_blocks, after, env);
            }
            throw new Error(`no pattern matches ${result.print()}`);
            // return asdfHelper(all_blocks, after, env);
        } else {
            const _: never = thing;
            throw new Error();
        }
    }
}

function resultFromExpression(expression: Expression, env: Map<string, Value>, all_blocks: Map<string, Block>): Value {
    if (expression instanceof Quote) {
        return fillInVariables(expression.value, env);
    } else if (expression instanceof FuncCall) {
        return interpreter(all_blocks, expression.func_name, expression.args.map(v => fillInVariables(v, env)));
    } else {
        const _: never = expression;
        throw new Error();
    }
}

function fillInVariables(value: Value, env: Map<string, Value>): Value {
    if (value instanceof VarName) {
        return get(env, value.name);
    } else if (value instanceof StringLiteral) {
        return value;
    } else if (value instanceof Underscore) {
        throw new Error('cant fill an underscore');
    } else if (value instanceof Tuple) {
        return new Tuple(value.values.map(x => fillInVariables(x, env)));
    } else {
        const _: never = value;
        throw new Error();
    }
}

function findBindings(pattern: Value, value: Value): Map<string, Value> | null {
    if (pattern instanceof VarName) {
        return new Map([[pattern.name, value]]);
    } else if (pattern instanceof Underscore) {
        return new Map();
    } else if (pattern instanceof StringLiteral) {
        if (value instanceof StringLiteral && pattern.value === value.value) {
            return new Map();
        } else {
            return null;
        }
    } else if (pattern instanceof Tuple) {
        if (!(value instanceof Tuple) || pattern.values.length !== value.values.length) {
            return null;
        }

        const result = new Map<string, Value>();
        for (let i = 0; i < pattern.values.length; i++) {
            const subBindings = findBindings(pattern.values[i], value.values[i]);
            if (subBindings === null) {
                return null;
            }
            for (const [key, val] of subBindings) {
                if (result.has(key) && !areValuesEqual(ensure(result.get(key)), val)) {
                    return null;
                }
                result.set(key, val);
            }
        }
        return result;
    } else {
        const _: never = pattern;
        throw new Error("Unexpected pattern type");
    }
}

function areValuesEqual(a: Value, b: Value): boolean {
    return a.isEqualTo(b);
}

function indent(str: string, level: number): string {
    const indentation = '  '.repeat(level);
    return str.split('\n').map(line => indentation + line).join('\n');
}

export function randVarName(): string {
    return 'var_' + (Math.random()).toString().split('.')[1];
}

export function randBlockName(): string {
    return 'block_' + (Math.random()).toString().split('.')[1];
}

//////////////////////////
// OPTIMIZER

export function optimize(blocks: Map<string, Block>, main_block_name: string): Map<string, Block> {
    for (let k = 0; k < 10; k++) {
        blocks = inlineOutermostFunccall(blocks, main_block_name);
        blocks = removeUncalledBlocks(blocks, main_block_name);
        blocks = removeUnusedBlockInputs(blocks);
        blocks = inlineQuoteWithSinglePattern(blocks);
        blocks = inlineBlocksThatJustReturn(blocks);
        blocks = inlineQuotes(blocks);
        if (k % 5 == 4) {
            blocks = inlineFirstStepOfBlocks(blocks, main_block_name);
        }
    }
    return blocks;
}

function inlineOutermostFunccall(blocks: Map<string, Block>, main_block_name: string): Map<string, Block> {
    const main_block = get(blocks, main_block_name);
    if (!(main_block.body instanceof MoreStuff)) return blocks;
    const expression = main_block.body.expression;
    if (expression instanceof FuncCall) {
        const var_name = randVarName()
        let join_block = new Block([var_name, ...main_block.input_variables], new MoreStuff(
            new Quote(new VarName(var_name)), main_block.body.after));
        const join_name = randBlockName()

        let new_main_block = changeRetsToJumps(
            inlineValues(get(blocks, expression.func_name), expression.args),
            join_name, main_block.input_variables);

        return combineMaps(blocks, new Map([
            [main_block_name, new_main_block],
            [join_name, join_block],
        ]));
    } else {
        const used_blocks = getUsedBlocks(main_block.body);
        for (const block_name of used_blocks) {
            blocks = inlineOutermostFunccall(blocks, block_name);
        }
        return blocks;
    }
}

function removeUncalledBlocks(blocks: Map<string, Block>, main_block_name: string): Map<string, Block> {
    // const used_names: string[] = [];
    const used_names = [main_block_name];
    const pending_names = [main_block_name];

    while (true) {
        const cur_block_name = pending_names.shift();
        if (cur_block_name === undefined) {
            break;
        }
        const cur_block = get(blocks, cur_block_name);
        for (const other_name of getUsedBlocks(cur_block.body)) {
            if (!used_names.includes(other_name)) {
                used_names.push(other_name);
                pending_names.push(other_name);
            }
        }
    }

    return new Map(used_names.map(name => [name, get(blocks, name)]));
}

function getUsedBlocks(after: After): string[] {
    if (after instanceof JumpTo) {
        return [after.block_name];
    } else if (after instanceof Return) {
        return [];
    } else if (after instanceof MoreStuff) {
        const hola = after.after.flatMap(cosa => getUsedBlocks(cosa.after));
        if (after.expression instanceof FuncCall) {
            hola.push(after.expression.func_name);
        }
        return hola;
    } else {
        const _: never = after;
        throw new Error();
    }
}

function getJumpedBlocks(after: After): string[] {
    if (after instanceof JumpTo) {
        return [after.block_name];
    } else if (after instanceof Return) {
        return [];
    } else if (after instanceof MoreStuff) {
        const hola = after.after.flatMap(cosa => getJumpedBlocks(cosa.after));
        return hola;
    } else {
        const _: never = after;
        throw new Error();
    }
}

function removeUnusedBlockInputs(blocks: Map<string, Block>): Map<string, Block> {
    // TODO: remove input variables named '_'

    function helper(cur_name: string, blocks: Map<string, Block>): Map<string, Block> {
        const cur_block = get(blocks, cur_name);
        const really_used_vars = cur_block.body.requiredVariables();
        const unused_variables_indices = cur_block.input_variables.map((name, k) => really_used_vars.includes(name) ? false : k).filter(x => x !== false);
        if (unused_variables_indices.length === 0) {
            return blocks;
        } else {
            return removeValuesFromJumps(blocks, cur_name, unused_variables_indices);
        }
    }

    function removeValuesFromJumps(blocks: Map<string, Block>, block_name: string, to_remove: number[]): Map<string, Block> {
        return mapValues(blocks, (n, b) => new Block(
            n === block_name
                ? b.input_variables.filter((_, k) => !to_remove.includes(k))
                : b.input_variables,
            b.body.removeValuesFromJumps(block_name, to_remove)));
    }

    const all_block_names = blocks.keys()
    for (const name of all_block_names) {
        blocks = helper(name, blocks);
    }
    return blocks;
}

function inlineFirstStepOfBlocks(blocks: Map<string, Block>, main_block_name: string): Map<string, Block> {
    const main_block = get(blocks, main_block_name);
    if (!(main_block.body instanceof MoreStuff)) return blocks;

    const jumped_blocks = main_block.body.after.flatMap(({ after }) => getJumpedBlocks(after));
    const block_name_to_inline = jumped_blocks.shift();
    if (block_name_to_inline === undefined) return blocks;

    const block_to_inline = get(blocks, block_name_to_inline);
    if (!(block_to_inline.body instanceof MoreStuff)) {
        throw new Error("this should have been inlined in another pass");
    }

    const expr_to_inline = block_to_inline.body.expression;
    const the_stuff = block_to_inline.body.after.map(({ pattern, after }) => {
        const pattern_vars = pattern.requiredVariables();
        return {
            new_block_name: randBlockName(),
            new_block: new Block(
                [...pattern_vars, ...block_to_inline.input_variables],
                after
            ),
            pattern,
        };
    });

    const new_main_block = new Block(main_block.input_variables,
        main_block.body.inlineJumpsOneLevel(
            block_name_to_inline,
            block_to_inline.input_variables,
            expr_to_inline,
            the_stuff,
        )
    );

    return combineMaps(blocks,
        new Map(the_stuff.map(({ new_block_name, new_block }) => {
            return [new_block_name, new_block];
        })),
        new Map([[main_block_name, new_main_block]]));
}

// TODO: inlineBlocksThatJustJumpToAnotherBlock
function inlineBlocksThatJustReturn(blocks: Map<string, Block>): Map<string, Block> {
    function helper(cur_name: string, blocks: Map<string, Block>): Map<string, Block> {
        const cur_block = get(blocks, cur_name);
        if (cur_block.body instanceof Return) {
            return inlineBlockEverywhere(blocks, cur_name, cur_block.body.value, cur_block.input_variables);
        } else {
            return blocks;
        }
    }

    function inlineBlockEverywhere(blocks: Map<string, Block>, block_name: string, value_to_return: Value, input_names: string[]): Map<string, Block> {
        return mapFilterValues(blocks, (n, b) => n === block_name ? null : new Block(
            b.input_variables,
            b.body.changeJumpsToRets(block_name, value_to_return, input_names)));
    }

    const all_block_names = blocks.keys()
    for (const name of all_block_names) {
        blocks = helper(name, blocks);
    }
    return blocks;
}

function inlineQuotes(blocks: Map<string, Block>): Map<string, Block> {
    return mapValues(blocks, (_k, b) => new Block(b.input_variables, b.body.maybeInlineQuote()));
}

function inlineQuoteWithSinglePattern(blocks: Map<string, Block>): Map<string, Block> {
    function helper(asdf: MoreStuff): After {
        if (asdf.expression instanceof Quote && asdf.after.length === 1) {
            const { pattern, after } = asdf.after[0];
            const bindings = ensure(findBindings(pattern, asdf.expression.value));
            return after.inlineValues(bindings);
        } else {
            return asdf;
        }
    }
    return mapValues(blocks, (_, b) => !(b.body instanceof MoreStuff) ? b : new Block(b.input_variables, helper(b.body)));
}

function inlineValues(block: Block, new_inputs: Value[]): Block {
    const old_input_names = block.input_variables;
    const map = zipToMap(old_input_names, new_inputs);
    return new Block(new_inputs.map(x => x instanceof VarName ? x.name : '_'), block.body.inlineValues(map));
}

function changeRetsToJumps(block: Block, join_name: string, extra_input_names: string[]): Block {
    // new Return(x) -> new JumpTo(join_name, [x, ...extra_inputs])
    return new Block(block.input_variables,
        block.body.changeRetsToJumps(join_name, extra_input_names));
}

function* zip2<T, S>(array1: Iterable<T>, array2: Iterable<S>): Generator<[T, S]> {
    const iterator1 = array1[Symbol.iterator]();
    const iterator2 = array2[Symbol.iterator]();
    while (true) {
        const next1 = iterator1.next();
        const next2 = iterator2.next();
        const done = (next1.done ?? false) || (next2.done ?? false);
        if (done) return;
        yield [next1.value, next2.value];
    }
}

function substract(main: string[], to_remove: string[]): string[] {
    return main.filter(x => !to_remove.includes(x));
}

export function testEqValues(test_name: string, expected: Value, got: Value): void {
    console.log(test_name + (expected.isEqualTo(got) ? ' passed' : ' FAILED'));
}
