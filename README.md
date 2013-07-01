# wgrep

`wgrep` is a command line utility for running selector queries against HTTP-based 
resources.

## Examples

```Shell
wgrep -q "a" http://google.com
```

This example will return a tab-delimited list of link text and resources they
are linked to.

If you want only the `a` tags that have an href:

```Shell
wgrep -q "a[href]" http://google.com
```

The `q` flag accepts a css selector for `text/html` (and XML/XHTML) MIME'd
resources.

But what if you've got a JSON url?

```Shell
wgrep -miq "$.feed.entry[*].title[*].$t" "https://gdata.youtube.com/feeds/api/videos?q=cats&v=2&alt=json"
```

The above will show you an ordered list of the title of the top 25 search
results on YouTube for "cats".

We use [JSONPath](http://goessner.net/articles/JsonPath/) to handle JSON query
operations.

## Usage

`wgrep` is your standard command line utility. As such, you run it basically
with:

```Shell
wgrep [options] <url>
```

An HTTP URL is required (although we are definitely thinking about adding file and 
stdin inputs as well).

## Install

We're working on an npm & homebrew package, but to get started with it now:

```Shell
wget <link to wgrep.js> # wgrep.js somewhere you'd like to store it.
chmod +x wgrep.js # make it executable
brew install node # if you don't already have node
npm install cheerio commander JSONPath request underscore # install node dependencies
ln -s <absolute path to>/wgrep.js /usr/local/bin/wgrep # link it somewhere in your $PATH
```

Now you should have a working wgrep command.

## Options

 - `-h, --help`: Prints out the help message.

 - `-V, --version`: Prints out the version number.

 - `-u, --user <username>`: Allows you to provide a username for basic auth.

 - `-p, --password [password]`: Allows you to provide a password for basic auth. Will ask for one if it's not provided.

 - `-q, --query <query>`: Allows you to provide a query selector string to run against the resource.

 - `-m, --markdown`: Returns results in a (best-guess) Markdown format.

    This works really nicely with links and images:
    ```Shell
    wgrep -mq "a[href]" http://google.com
    wgrep -mq "img" http://google.com
    ```
    
 - `-i, --ordered`: With `-m`, returns results as an ordered list.

 - `-l, --list`: With `-m`, returns results as an unordered list.

 - `-j, --json`: Returns results as a JSON string.

 - `-n, --inspect`: With -j, inspects the JSON results, with a default depth of 2 and colorized output.

## Credits

Written by [Paul DeLeeuw](http://twitter.com/pauld) for debugging URLs and
other HTTP-based shenanigans.

Written in Javascript, runs in [node](http://nodejs.org).
Makes use of several awesome open source projects, like
 - [cheerio](https://github.com/MatthewMueller/cheerio)
 - [commander](https://github.com/visionmedia/commander.js/)
 - [JSONPath](http://goessner.net/articles/JsonPath/)
 - [request](https://github.com/mikeal/request)
 - [underscore](http://underscorejs.org)

Thanks to all the contributors of these fine projects.