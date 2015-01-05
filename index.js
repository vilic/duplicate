/*
    Duplicate (Node)
    https://github.com/vilic/duplicate

    by VILIC VANE
    https://github.com/vilic

    MIT License
*/

var path = require('path');

var fs = require('fs-extra');
var glob = require('glob');
var minimatch = require('minimatch');
var chokidar = require('chokidar');

module.exports = function (options) {
    if (!options) {
        throw new Error('options required');
    }

    var srcs = options.src;
    var dest = options.dest;

    var ignored = options.ignored || /[\/\\](?:\.|node_modules(?=[\/\\]|$))/;

    if (!(srcs instanceof Array)) {
        srcs = srcs ? [srcs] : [];
    }

    for (var i = 0; i < srcs.length; i++) {
        srcs[i] = path.normalize(srcs[i]);
    }

    if (!srcs.length) {
        throw new Error('options.src required');
    }

    if (typeof dest != 'string') {
        throw new Error('options.dest required');
    }

    var cwd = process.cwd();
    var watcherReady = false;

    console.log('scanning files for initial copying...');
    copyAll();

    function copyAll() {
        var destFileHash = {};

        nextSrc(srcs.concat());

        function nextSrc(srcs) {
            var src = srcs.shift();
            if (!src) {
                var destFiles = Object.keys(destFileHash);
                console.log('copying all ' + destFiles.length + ' files...');

                destFiles.forEach(function (filePath) {
                    var relPath = path.relative(cwd, filePath);
                    var destPath = path.join(dest, relPath);

                    fs.copySync(filePath, destPath);
                });

                console.log('all files copied.');
                console.log('initializing watching...');
                watch();

                return;
            }

            glob(src, function (err, files) {
                files.forEach(function (file) {
                    destFileHash[file] = null;
                });

                nextSrc(srcs);
            });

        }
    }

    function watch() {
        var watcher = chokidar.watch('.', {
            ignored: ignored, 
            persistent: true
        });

        watcher
            .on('add', function(filePath) {
                if (watcherReady && matchSrc(filePath)) {
                    processCopy(filePath);
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
                watcherReady = true;
                console.log('started watching.');
            })
            .on('error', function(err) {
                logError(err);
            });
    }

    function matchSrc(filePath) {
        return srcs.some(function (src) {
            return minimatch(path.resolve(filePath), path.resolve(src));
        });
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
        })
    }

    function logError(err) {
        if (err instanceof Error) {
            console.error(err.stack);
        } else {
            console.error(err);
        }
    }
};