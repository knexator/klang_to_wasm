import { interpreter, optimize, StringLiteral, Tuple } from "./core.ts";
import { readBlocksFromStr } from "./reader.ts";

const all_blocks = readBlocksFromStr(`

(main input) -> (getFirst input) {
    first_or_nothing -> (isNull first_or_nothing) {
        result -> (ret result);
    }
}

(getFirst list) -> (quote list) {
    #Empty -> (ret #Nothing);
    (#Pair first rest) -> (ret (#Just first));
}

(isNull maybe_thing) -> (quote maybe_thing) {
    #Nothing -> (ret #True);
    (#Just _) -> (ret #False);
}

`);

const v1 = interpreter(all_blocks, 'main', [new StringLiteral('Empty')]);

if (v1 instanceof StringLiteral && v1.value === 'True') {
    console.log('basic test 1 passed');
} else {
    console.log('basic test 1 FAILED');
}

const v2 = interpreter(all_blocks, 'main', [new Tuple([new StringLiteral('Pair'), new StringLiteral('Hola'), new StringLiteral('Empty')])]);

if (v2 instanceof StringLiteral && v2.value === 'False') {
    console.log('basic test 2 passed');
} else {
    console.log('basic test 2 FAILED');
}