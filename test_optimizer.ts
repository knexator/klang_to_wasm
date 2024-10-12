//////////////////////////

import { Block, MoreStuff, optimize, Tuple } from "./core.ts";
import { readBlocksFromStr } from "./reader.ts";
import { get } from "./std.ts";

const naive_getfirst_isnull = readBlocksFromStr(`

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

const fused_getfirst_isnull = readBlocksFromStr(`

(main input) -> (quote input) {
    #Empty -> (ret #True);
    (#Pair _ _) -> (ret #False);
}

`);

// (+ 3 ($if ($and (< 1 n) (< n 4)) 7 8))
// const fuse_and_branches = TODO

const a = get(optimize(naive_getfirst_isnull, 'main'), 'main');
const b = get(fused_getfirst_isnull, 'main');

if (a.isEqualTo(b)) {
    console.log('optimizer test 1 passed');
} else {
    console.log('optimizer test 1 FAILED');
}
