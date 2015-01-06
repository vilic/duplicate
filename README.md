# Duplicate

This tool is for keeping specific files of two directories synchronized. You may use it in
[Gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md#3-create-a-gulpfilejs-at-the-root-of-your-project)
or [Grunt](http://gruntjs.com/creating-tasks#basic-tasks).

It will copy all matching files to dest directory before watching.

## Install

```sh
npm install duplicate --save-dev
```

## Usage

```javascript
var duplicate = require('duplicate');

duplicate({
    src: [
        'scripts/**/*.js',
        'css/**/*.css',
        'images/**/*',
        'merges/**/*',
        '*.html'
    ],
    dest: '../app-cordova'
});
```

## API Definitions

```typescript
interface IOptions {
    /** refer to https://github.com/es128/anymatch */
    src: any;
    dest: string;
    /** 
     * default to /(?:^|[\/\\])(?:\.(?![\/\\]|$)|node_modules(?=[\/\\]|$))/,
     * make sure path '.' will not be ignored.
     */
    ignored?: RegExp | (path: string) => boolean;
}

declare function duplicate(options: IOptions): void;

declare module duplicate { }
```