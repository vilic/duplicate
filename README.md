# Duplicate

This tool is for keeping specific files of two directories synchronized. You may use it in Gulp or Grunt.

It will copy all matching files to dest directory before watching.

## Usage

```javascript
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

API Definitions

```typescript
interface {
	/** refer to minimatch */
	src: string | string[];
	dest: string;
	/**
	 * default to /[\/\\](?:\.|node_modules(?=[\/\\]|$))/ 
	 * refer to https://github.com/es128/anymatch
	 */
	ignored?: any;
}


function duplicate(options: IOptions): void;
```