# Templates

## Installing 

### Remote templates

If you want to install a template from a remote repository (e.g. Github), it's as easy as running
```
wsce template add
```

TODO: Add an example GIF of `wsce template add`

### Local templates

The procedure for installing a local template is pretty much the same as installing a remote one. Just pass the template's local path when asked to and that'a it !

## Removing
You can remove templates by running 
```
wsce template remove
```
You will then be asked which templates you want to remove.
## Creating

If you want to make your own project template, this is what you're looking for.

Start by creating a folder named however you want(as long as it's not called something like `åw€ßøM€-ƒö\∂€®`).

Each template should contain a `wsce.properties.json` file. 
The file needs to contain the following:

```json
{
    "name": "My Template name"
}
```

This is done so you can display a different name from the folder name when selecting it in the CLI.

It is also recommended to include a `wsce.config.js` file, since this is pretty much the point of having templates. When writing a config file, it's also recommended to include
```js
/**
 * @type {import("./wsce").WsceConfig}
 */
```
just above the 
```js
module.exports = {...}
```
So the user can use the auto-included typings to fill in the config.

You can then organize the folder however you like it. `wsce` uses CommonJS, this means you have use `module.exports`,  `require()`, etc.

