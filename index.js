/*
    Duplicate (Node)
    https://github.com/vilic/duplicate

    by VILIC VANE
    https://github.com/vilic

    MIT License
*/

var path = require('path');

var fs = require('fs-extra');
var anymatch = require('anymatch');
var chokidar = require('chokidar');

module.exports = function (options) {
    if (!options) {
        throw new Error('options required');
    }

    var srcs = options.src;
    var dest = options.dest;

    var ignored = options.ignored || /(?:^|[\/\\])(?:\.(?![\/\\]|$)|node_modules(?=[\/\\]|$))/;

    if (!(srcs instanceof Array)) {
        srcs = srcs ? [srcs] : [];
    }

    if (!srcs.length) {
        throw new Error('options.src required');
    }

    srcs = srcs.map(function (src) {
        return path.resolve(src);
    });

    var matcher = anymatch(srcs);

    if (typeof dest != 'string') {
        throw new Error('options.dest required');
    }

    var cwd = process.cwd();
    var watcherReady = false;

    console.log('scanning files...');

    var destFileMap = {};
    
    watch();

    function watch() {
        var watcher = chokidar.watch('.', {
            ignored: ignored,
            persistent: true
        });

        watcher
            .on('add', function(filePath) {
                if (matchSrc(filePath)) {
                    if (watcherReady) {
                        processCopy(filePath);
                    } else {
                        var destPath = path.join(dest, filePath);
                        destFileMap[filePath] = destPath;
                    }
                }
            })
            .on('change', function(filePath) {
                if (matchSrc(filePath)) {
                    processCopy(filePath);
                }
            })
            .on('unlink', function(filePath) {
                if (matchSrc(filePath)) {
                    processDelete(filePath);
                }
            })
            .on('ready', function () {
                copyAll();
                watcherReady = true;
                console.log('started watching.');
            })
            .on('error', function(err) {
                logError(err);
            });
    }

    function copyAll() {
        var files = Object.keys(destFileMap);
        console.log('copying ' + files.length + ' files...');

        files.forEach(function (filePath) {
            var destPath = destFileMap[filePath];
            fs.copySync(filePath, destPath);
        });

        console.log('all files copied.');
    }

    function matchSrc(filePath) {
        return matcher(path.resolve(filePath));
    }

    function processCopy(filePath) {
        var destPath = path.join(dest, filePath);
        fs.copy(filePath, destPath, function (err) {
            if (err) {
                logError(err);
                return;
            }
            console.log('copied "' + filePath + '" to "' + destPath + '".');
        });
    }

    function processDelete(filePath, isDest) {
        var destPath;

        if (isDest) {
            destPath = filePath;
        } else {
            destPath = path.join(dest, filePath);
        }

        fs.remove(destPath, function (err) {
            if (err) {
                logError(err);
                return;
            }

            console.log('deleted "' + destPath + '".');
            removeDirIfEmpty(path.dirname(destPath));
        });
    }

    function removeDirIfEmpty(dirPath) {
        fs.readdir(dirPath, function (err, files) {
            if (err) {
                logError(err);
                return;
            }

            if (!files.length) {
                processDelete(dirPath, true);
            }
        });
    }

    function logError(err) {
        if (err instanceof Error) {
            console.error(err.stack);
        } else {
            console.error(err);
        }
    }
};