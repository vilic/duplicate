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

var DEFAULT_VERSION_FILE = 'version.js';
var DEFAULT_VERSION_VARIABLE = 'VERSION_STRING';
var DEFAULT_INITIAL_VERSION = '0.0.0.0';

module.exports = function (options) {
    if (!options) {
        throw new Error('options required');
    }

    var srcs = options.src;
    var dest = options.dest;

    var ignored = options.ignored || /(?:^|[\/\\])(?:\.(?![\/\\]|$)|node_modules(?=[\/\\]|$))/;

    var version = options.version;
    var versionFile;
    var versionVariable;

    if (version) {
        if (version instanceof Object) {
            versionFile = version.file || DEFAULT_VERSION_FILE;
            if (/\.js$/i.test(versionFile)) {
                versionVariable = version.variable || DEFAULT_VERSION_VARIABLE;
            }
        } else {
            versionFile = DEFAULT_VERSION_FILE;
            versionVariable = DEFAULT_VERSION_VARIABLE;
        }
    }

    if (!(srcs instanceof Array)) {
        srcs = srcs ? [srcs] : [];
    }

    if (!srcs.length) {
        throw new Error('options.src required');
    }

    srcs = srcs.map(function (src) {
        return path.resolve(src);
    });

    var fileMatcher = anymatch(srcs);
    var versionFileMatcher;

    if (version) {
        versionFileMatcher = anymatch([versionFile]);
    }

    if (typeof dest != 'string') {
        throw new Error('options.dest required');
    }

    var versionUpdateTimer;
    updateVersion(true);

    function updateVersion(init) {
        if (!version) {
            return;
        }

        clearTimeout(versionUpdateTimer);

        if (!init) {
            versionUpdateTimer = setTimeout(process, 500);
        } else {
            process();
        }

        function process() {
            var versionString;
            var text;

            if (fs.existsSync(versionFile)) {
                text = fs.readFileSync(versionFile, 'utf-8');
                var groups = text.match(/((?:\d+\.)+)(\d+)/);
                if (groups) {
                    versionString = groups[1] + (Number(groups[2]) + (init ? 0 : 1));
                }
            }

            if (!versionString) {
                versionString = DEFAULT_INITIAL_VERSION;
            }

            var output;
            if (versionVariable) {
                output = 'var ' + versionVariable + ' = \'' + versionString + '\';';
            } else {
                output = versionString;
            }

            if (text == output) {
                return;
            }

            fs.writeFileSync(versionFile, output);
            processCopy(versionFile);
        }
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
                    updateVersion();

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
                    updateVersion();
                    processCopy(filePath);
                }
            })
            .on('unlink', function(filePath) {
                if (matchSrc(filePath)) {
                    updateVersion();
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
        var resolvedPath = path.resolve(filePath);
        return !versionFileMatcher(resolvedPath) && fileMatcher(resolvedPath);
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