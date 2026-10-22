import * as before from './handling-baseline.mjs';
import * as after from './handling-physics.mjs?v=source-audit-1';
import {benchmark} from './handling-bench.mjs';
self.onmessage=()=>self.postMessage({before:benchmark(before),after:benchmark(after)});
