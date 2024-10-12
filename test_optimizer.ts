//////////////////////////

import { Block, FuncCall, interpreter, MoreStuff, optimize, Quote, Return, StringLiteral, Tuple, VarName } from "./core";

/*
(isNull (getFirst input))
->
(getFirst input) (
    ( Nothing ($quote True) return ) 
    ( (Just @thing) ($quote False) return ) 
)
->
input (
    ( Empty ($quote Nothing) (
        ( Nothing ($quote True) return ) 
        ( (Just @thing) ($quote False) return ) 
    ) ) 
    ( (Pair @first @rest) ($quote (Just @first)) (
        ( Nothing ($quote True) return ) 
        ( (Just @thing) ($quote False) return ) 
    ) ) 
)

(krnl main (input)
    ($getFirst input) (
        ( @first_or_nothing (isNull @first_or_nothing) return ) 
    )
)

(krnl isNull (thing)
    thing (
        ( Nothing ($quote True) return ) 
        ( (Just @thing) ($quote False) return ) 
    )
)

(krnl getFirst (list)
    list (
        ( Empty ($quote Nothing) return ) 
        ( (Pair @first @rest) ($quote (Just @first)) return ) 
    )
)

main: {
    getFirst(input) {
        @first_or_nothing -> isNull(@first_or_nothing);
    }
}
isNull: {
    Nothing -> $quote(True);
    (Just @_) -> $quote(False);
}
*/

function vars(asdf: string): VarName[] {
    return asdf.split(',').map(x => new VarName(x));
}

const fuse_getfirst_isnull = new Map(Object.entries({
    main: new Block(['input'], new MoreStuff(
        new FuncCall('getFirst', vars('input')),
        [{
            pattern: new VarName('first_or_nothing'),
            after: new MoreStuff(
                new FuncCall('isNull', vars('first_or_nothing')),
                [{
                    pattern: new VarName('result'),
                    after: new Return(new VarName('result')),
                }]
            )
        }]),
    ),
    getFirst: new Block(['list'], new MoreStuff(
        new Quote(new VarName('list')),
        [
            {
                pattern: new StringLiteral('Empty'),
                after: new Return(new StringLiteral('Nothing'))
            },
            {
                pattern: new Tuple([new StringLiteral('Pair'), new VarName('first'), new VarName('rest')]),
                after: new Return(new Tuple([new StringLiteral('Just'), new VarName('first')]))
            },
        ]
    )),
    isNull: new Block(['maybe_thing'], new MoreStuff(
        new Quote(new VarName('maybe_thing')),
        [
            {
                pattern: new StringLiteral('Nothing'),
                after: new Return(new StringLiteral('True'))
            },
            {
                pattern: new Tuple([new StringLiteral('Just'), new VarName('_')]),
                after: new Return(new StringLiteral('False'))
            },
        ]
    )),
}));

// (+ 3 ($if ($and (< 1 n) (< n 4)) 7 8))
// const fuse_and_branches = TODO

let all_blocks = fuse_getfirst_isnull;
all_blocks = optimize(all_blocks, 'main');

for (const [name, block] of all_blocks.entries()) {
    console.log(`${name}: ${block.print()}`);
}


const v1 = interpreter(all_blocks, 'main', [new StringLiteral('Empty')]);

if (v1 instanceof StringLiteral && v1.value === 'True') {
    console.log('test 1 passed');
} else {
    console.log('test 1 failed');
}

const v2 = interpreter(all_blocks, 'main', [new Tuple([new StringLiteral('Pair'), new StringLiteral('Hola'), new StringLiteral('Empty')])]);

if (v2 instanceof StringLiteral && v2.value === 'False') {
    console.log('test 2 passed');
} else {
    console.log('test 2 failed');
}