# babel-plugin-transform-imports-with-loader

> Transform imports into variable definition scripts by custom loader

[![Build Status](https://travis-ci.org/JiyuShao/babel-plugin-transform-imports-with-loader.svg?branch=master)](https://travis-ci.org/JiyuShao/babel-plugin-transform-imports-with-loader) [![Coverage Status](https://coveralls.io/repos/github/JiyuShao/babel-plugin-transform-imports-with-loader/badge.svg?branch=master)](https://coveralls.io/github/JiyuShao/babel-plugin-transform-imports-with-loader?branch=master)

## Installation

```bash
npm install --save-dev babel-plugin-transform-imports-with-loader
```

## Usage

Via `.babelrc`:

```json
{
  "plugins": [
    [
      "babel-plugin-transform-imports-with-loader",
      {
        "rules": {
          "test": "\\.txt",
          "unserializeFunc": "String" // default is String
          // "transform": () => {} // transfom option only support in js
        }
      }
    ]
  ]
}
```

Or Via `.babelrc.js`

```js
module.exports = {
  plugins: [
    [
      'babel-plugin-transform-imports-with-loader',
      {
        rules: {
          test: /\.txt/,
          unserializeFunc: 'String', // default is string
          transform: code => {
            // transform will allow you to process code string
            console.log(code);
            return code;
          },
        },
      },
    ],
  ],
};
```

Will transfer following code

`index.js`

```js
import testTxt from './test.txt';
console.log(testJS, testTxt);
```

`test.txt`

```txt
this is demo text
```

to

```js
const __BABEL_TRANSFORM_IMPORTS__lvytyy8jdmk4hwt0jp = String;

const testTxt = __BABEL_TRANSFORM_IMPORTS__lvytyy8jdmk4hwt0jp(
  `this is demo text`
);

console.log(testJS, testTxt);
```

**Both option `options.rules` and `options.rules[].test` support array configuration**
