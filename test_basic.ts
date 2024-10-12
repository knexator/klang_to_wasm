import { interpreter, optimize, StringLiteral, testEqValues, Tuple } from "./core.ts";
import { readBlocksFromStr, readValueFromStr } from "./reader.ts";

const is_list_empty_blocks = readBlocksFromStr(`

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

const v1 = interpreter(is_list_empty_blocks, 'main', [new StringLiteral('Empty')]);

if (v1 instanceof StringLiteral && v1.value === 'True') {
    console.log('basic test 1 passed');
} else {
    console.log('basic test 1 FAILED');
}

const v2 = interpreter(is_list_empty_blocks, 'main', [new Tuple([new StringLiteral('Pair'), new StringLiteral('Hola'), new StringLiteral('Empty')])]);

if (v2 instanceof StringLiteral && v2.value === 'False') {
    console.log('basic test 2 passed');
} else {
    console.log('basic test 2 FAILED');
}

////////////////////////

const arithmetic_blocks = readBlocksFromStr(`

(< a b) -> (quote (a b)) {
    (_ #Zero) -> (ret #False);
    (#Zero _) -> (ret #True);
    ((#Succ a2) (#Succ b2)) -> (< a2 b2) {
        res -> (ret res); 
    }
}

(+ a b) -> (quote a) {
    #Zero -> (ret b);
    (#Succ prev_a)-> (+ prev_a (#Succ b)) {
        res -> (ret res); 
    }
}

`);

const my_true = readValueFromStr('#True');
const my_false = readValueFromStr('#False');
const two = readValueFromStr(`(#Succ (#Succ #Zero))`);
const three = readValueFromStr(`(#Succ (#Succ (#Succ #Zero)))`);
const five = readValueFromStr(`(#Succ (#Succ (#Succ (#Succ (#Succ #Zero)))))`);

testEqValues('arithmetic test 1', 
    interpreter(arithmetic_blocks, '<', [two, three]),
    my_true);

testEqValues('arithmetic test 2', 
    interpreter(arithmetic_blocks, '<', [three, two]),
    my_false);

testEqValues('arithmetic test 3', 
    interpreter(arithmetic_blocks, '+', [two, three]),
    five);
