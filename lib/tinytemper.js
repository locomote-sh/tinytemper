/*************************************************************
 * Copyright InnerFunction Ltd. 2016 -- All Rights Reserved. *
 * Unauthorized copying of this file is strictly prohibited. *
 *************************************************************/

// A tiny template engine.

// Regex for parsing templates.
// Attempts to match the following groups:
// 1. Prefix not containing a { character.
// 2. A valid reference between { and } characters.
// 3. Suffix after a } character.
const re = /^([^{]*)[{]([-a-zA-Z0-9_$.]+)[}]([\s\S]*)$/;

// Create a compiled template text node.
function text( text ) {
    // Return a function which returns the text.
    return () => text;
}

// Create a compiled template reference node.
function ref( ref ) {
    // Ref is a dotted path reference - break into an array of path components.
    ref = ref.split('.');
    // Return a function which resolves the reference against a data context.
    return ( cx ) => {
        let value = resolve( ref, cx );
        return value === undefined ? '' : value;
    };
}

// Resolve a dotted path reference against a data context.
// The reference is passed as an array of path components.
function resolve( ref, cx ) {
    for( let i = 0; i < ref.length && cx !== undefined; cx = cx[ref[i++]] );
    return cx;
}

// Parse a template string into a compiled template.
// Returns a function which can be evaluated against a data context.
function parseTemplate( t ) {
    let c = [];                         // An array of compiled template nodes (functions).
    while( t ) {                        // While still a template string to parse...
        let r = re.exec( t );           // Match the template string against the parse regex.
        if( r ) {                       // If match found...
            c.push( text( r[1] ) );     // Then first group is the reference prefix...
            c.push( ref( r[2] ) );      // Followed by a data reference...
            t = r[3];                   // Followed by the unparsed suffix.
        }
        else {                          // Else no match found.
            let i = t.indexOf('}');     // Check for possible invalid reference...
            if( i > -1 ) {              // ...and if found...
                c.push( text( t.substring( 0, i + 1 ) ) );  // ...then add string up to }
                t = t.substring( i + 1 );   // ...and continue parsing after the }
            }
            else {                      // No more references in the template,
                c.push( text( t ) );    // so append the rest of the template text...
                t = false;              // ...and finish parsing.
            }
        }
    }
    // Return a function to evaluate the compiled template against a data context.
    return ( ctx ) => {
        let s = '';                             // The result string.
        for( let i = 0; i < c.length; i++ ) {   // Iterate over the template nodes...
            s += c[i]( ctx );                   // ...and eval against the context.
        }
        return s;                               // Return the result string.
    };
}

// Cache of previously compiled templates.
const cache = {};

// Parse a template string.
function parse( t ) {
    let f = cache[t];
    if( !f ) {
        f = cache[t] = parseTemplate( t );
    }
    return f;
};

// Evaluate a template string against the specified context object.
function eval( t, c ) {
    return parse( t )( c );
};

if( require.main === module ) {
    // Module is being run from command line.
    // Example: node tinytemper.js <template> <querystring>
    if( process.argv.length < 4 ) {
        console.log('Usage: node tinytemper.js <template> <query>');
        console.log('Evaluate a Tiny Temper template and write the result to stdout.');
        console.log('Specify template variable name/value pairs using a URL style query string.');
        console.log('e.g. name1=value1&name2=value2');
        console.log('Remember to place the query string in quotes, to avoid shell interpretation');
        console.log('of the & character.');
        process.exit( 1 );
    }
    try {
        let template = require('fs').readFileSync( process.argv[2] ).toString();
        let context = require('querystring').parse( process.argv[3] );
        console.log( eval( template, context ) );
    }
    catch( e ) {
        console.log( e.message || e );
        process.exit( 1 );
    }
}
else {
    // Module has been required, export functions.
    exports.parse = parse;
    exports.eval = eval;
}
