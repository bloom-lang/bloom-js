A runtime environment for the Bloom language in Javascript

### Usage:
Experimental bloom runtime is inside `node_modules/bloom-runtime`. To use, include `var Bloom = require('bloom-runtime')` inside your javascript file. Look at `examples/bloom_paths.js` for example syntax.

    $ node examples/bloom_paths.js

However, these files are meant to be auto-generated from ruby-esque syntax by the parser found in the `parser` directory. The script `parse_bloom.sh` runs this parser.

    $ ./parse_bloom.sh examples/paths.rb paths.js
    $ node paths.js

To generate PL/pgSQL instead of javascript, use the optional --sql command-line argument.

    $ ./parse_bloom.sh --sql examples/paths.rb paths.sql
    $ plpgsql paths.sql

### Current Issues:

- Parser only includes argmin and pairs sql commands, the rest need to be implemented
- Bloom runtime only handles instantaneous operations (<=), the rest need to be implemented
- `examples/decision_tree/typed_dtree.rb` relies on unimplemented features
