#!/usr/bin/env node

/**
 * wgrep - a command line utility for running selector queries against
 * URL resources.
 *
 * Author: Paul DeLeeuw, ddm
 * Copyright: 2013
 *
 * License: BSD
 */

// !Includes and variable setup.
var cheerio = require('cheerio'),
    request = require('request'),
    prg = require('commander'),
    jsonpath = require('jsonpath'),
    _ = require('underscore'),
    inspect = require('util').inspect,
    html = '',
    url = '',
    options = {},
    queryTypes = {},
    processor;

// !Parse command line options
prg
    .version('0.1.0')
    .usage('[options] <url>')
    .option('-u, --user <username>', 'Provide a basic authentication user.')
    .option('-q, --query <query>', 'Provide a dom selector to query the dom.')
    .option('-p, --password [password]', 'Provide a password for basic authentication.')
    .option('-m, --markdown', 'Output as Markdown.')
    .option('-l, --list', 'With -m, output results as an unordered list.')
    .option('-i, --ordered', "With -m, output results as an ordered list.")
    .option('-j, --json', 'Return results as a json object.')
    .option('-n, --inspect', 'With -j, inspect the json results in a formatted output.')
    .parse(process.argv);

if (prg.args.length === 0) {
    console.log("Usage: wgrep [options] <url>\nwgrep --help for available options.");
    process.exit(1);
}

url = prg.args.pop();

// !Helper Methods.
// I may choose to move these into a package of some kind.

// Will prepend the `root` URL to the absolute path provided in `uri`.
function reroot(uri, root) {
    if (uri.indexOf('/') === 0) {
        if (root.slice(-1) === '/') {
            uri = root + uri.slice(1);
        } else {
            uri = root + uri;
        }
    }
    return uri;
}

// Checks the `markdown` and `json` flags, and reformats the
// incoming data appropriately.
function formatLink(text, link, rel, isImg) {
    if (typeof isImg === 'undefined') {
        isImg = false;
    }
    if (typeof rel === 'undefined') {
        rel = false;
    }
    var lnk = '';
    if (prg.markdown) {
        if (isImg) {
            lnk = "!";
        }
        lnk += "[" + text + "](" + link + ")";
    } else if (prg.json) {
        lnk = {"text": text, "link": link, "isImg": isImg, "rel": rel};
    } else {
        lnk = text + "\t" + link;
    }
    return lnk;
}

// Handles Markdown output; pretty much a passthru unless the `list` or
// `ordered` flags are used.
function formatResult(result, index) {
    var ret = result;
    if (prg.markdown && prg.list) {
        result = '*   ' + result;
    } else if (prg.markdown && prg.ordered) {
        result = (index + 1) + '.  ' + result;
    }
    return result;
}

// Handles combining the results into the appropriate output object.
// String output is modified primarily based on the `markdown` flag.
function joinResults(results) {
    var joiner = "\n",
        ret;
    if (prg.json) {
        ret = JSON.stringify(results);
    } else {
        if (prg.markdown) {
            joiner = "\n\n";
        }
        ret = results.join(joiner);
    }
    return ret;
}

// Handles output of the results, based on the `json` & `inspect` flags.
function displayResults(results) {
    if (results) {
        if (prg.json && prg.inspect) {
            console.log(inspect(JSON.parse(results), false, 2, true));
        } else {
            console.log(results);
        }
    }
}

// !Processors
// These processors are based on MIME type.
// They should be moved to some kind of package structure,
// which would allow for extending wgrep with plugins.

// This handles JSON responses using JSONPath for queries.
queryTypes['application/json'] = function(body, query, root) {
    var results = [],
        data = JSON.parse(body),
        queriedresults = jsonpath["eval"](data, query),
        ret;

    if (prg.json) {
        ret = JSON.stringify(queriedresults);
    } else {
        _(queriedresults).each(function(node, i) {
            results.push(formatResult(node, i));
        });
        ret = joinResults(results);
    }

    return ret;
};

// Handles HTML / XML / XHTML using Cheerio for queries.
queryTypes['text/html'] = function(body, query, root) {
    var results = [],
        queriedresults,
        $ = cheerio.load(body);
    queriedresults = $(query);
    // some magic will need to happen here.
    queriedresults.each(function(i) {
        var parsed = '', data = {};
        data.text = this.text();
        data.href = this.attr("href");
        data.src = this.attr('src');
        data.alt = this.attr('alt');
        parsed = data.text;

        if (data.href) {
            data.href = reroot(data.href, root);
            if (!data.text){
                data.text = 'Title: ' + this.attr('title');
            }
            parsed = formatLink(data.text, data.href, this.attr('rel'), false);
        }

        if (data.alt && data.src) {
            data.src = reroot(data.src, root);
            parsed = formatLink(data.alt, data.src, false, true);
        }

        if (parsed) {
            results.push(formatResult(parsed, i));
        }
    });
    return joinResults(results);
};

queryTypes['application/xml'] = queryTypes['text/html'];
queryTypes['application/xhtml+xml'] = queryTypes['text/html'];

// Catches the server response and chooses which queryTypes parser to run.
processor = function(error, response, body) {
    var results, contentType;
    if (!error && response.statusCode == 200) {
        if (prg.query) {
            results = false;
            contentType = response.headers['content-type'];
            contentType = contentType.split(';')[0];
            if (typeof queryTypes[contentType] !== 'undefined') {
                results = queryTypes[contentType](body, prg.query, response.request.uri.href);
            }
            displayResults(results);
        } else {
            displayResults(body);
        }
    } else {
        console.error(response.statusCode + ": " + body);
        process.exit(response.statusCode);
    }
};

// Set up our HTTP request.
options.url = url;

// Right now we only do GET; more in the future (but will probably require
// lots of other command line options.)
options.method = "GET";

// Handling authentication; this could probably be a little cleaner.
if (prg.user) {
    options.auth = {"user": prg.user, "sendImmediately": true};
    if (typeof prg.password !== 'string') {
        // collect password
        prg.password('Password: ', function(pass) {
            options.auth.pass = pass;
            request(options, processor);
        });
    } else {
        options.auth.pass = prg.password;
        request(options, processor);
    }
} else {
    request(options, processor);
}