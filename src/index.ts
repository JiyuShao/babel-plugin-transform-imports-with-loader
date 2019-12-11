/*
 * babel-plugin-transform-imports-with-loader
 * @Author: Jiyu Shao
 * @Date: 2019-12-06 16:52:20
 * @Last Modified by: Jiyu Shao
 * @Last Modified time: 2019-12-11 18:04:51
 */
import fs from 'fs';
import { resolve, dirname } from 'path';
import template from '@babel/template';
import dedent from 'dedent';

/**
 * options passed into current function
 */
export interface Options {
  // rules to transfer import
  rules: LoaderOptions | LoaderOptions[];
}

/**
 * loader options
 */
export interface LoaderOptions {
  // test file path to use current plugin
  test: RegExp | RegExp[];

  // custom transform function
  transformFunc?: string;
}

/**
 * validate and format options
 * @param {Options} options
 * @param {Record<string, any>} path using buildCodeFrameError to throw error
 * @returns {Options | never}
 */
const validateOptions = (options: Options, path: Record<string, any>) => {
  const { rules } = options;

  // get rulesArray from rules
  let rulesArray: LoaderOptions[];
  if (rules && !Array.isArray(rules)) {
    rulesArray = [rules];
  } else {
    rulesArray = rules;
  }

  // format rulesArray
  const parsedRulesArray = rulesArray.map(({ test, transformFunc }) => {
    // get testArray from test
    let testArray: RegExp[];
    if (!Array.isArray(test)) {
      testArray = [test];
    } else {
      testArray = test;
    }

    // validate option test
    if (testArray.some(e => !(e instanceof RegExp))) {
      throw path.buildCodeFrameError(
        '[options.rules] test is not RegExp or RegExp[]'
      );
    }

    // validate option transform
    try {
      transformFunc && eval(transformFunc)();
    } catch (e) {
      throw path.buildCodeFrameError(
        '[options.rules] is not function string',
        e.message
      );
    }

    return {
      test: testArray,
      transformFunc: transformFunc || 'String',
    };
  });

  return { rules: parsedRulesArray };
};

/**
 * get transformFuncUUID by transformFunc
 */
const getTransformFuncUUID = (matchedLoader, transformFuncUUIDCache) => {
  const matchedLoaderCache = transformFuncUUIDCache.find(
    e => e.transformFunc === matchedLoader.transformFunc
  );
  if (matchedLoaderCache) {
    return matchedLoaderCache.transformFuncUUID;
  }

  const uuid =
    Math.random()
      .toString(36)
      .substring(2) + Date.now().toString(36);
  matchedLoader.transformFuncUUID = `__BABEL_TRANSFORM_IMPORTS__${uuid}`;
  transformFuncUUIDCache.push({
    transformFunc: matchedLoader.transformFunc,
    transformFuncUUID: matchedLoader.transformFuncUUID,
  });
  return matchedLoader.transformFuncUUID;
};

/**
 * generate current import final ast
 * @param {string} variableName variable name
 * @param {string} filePath file path
 * @param {string} transformFuncUUID transform func unique id
 */
const generateImportAst = (variableName, filePath, transformFuncUUID) => {
  const fileContent = fs.readFileSync(filePath, {
    encoding: 'utf8',
  });

  const codeString = dedent`
  const ${variableName} = ${transformFuncUUID}(\`${fileContent.trim()}\`)
  `;

  return template.ast(codeString);
};

/**
 * handle babel import declaration transform
 * @param path
 * @param state
 * @param babel
 */
const ImportDeclaration = (
  path,
  state,
  { babel: { types: t }, transformFuncUUIDCache }
) => {
  // get validate options
  const validOptions = validateOptions(state.opts, path);

  // get import default specifier node
  const importDefaultSpecifierNode = path.node.specifiers.find(
    t.isImportDefaultSpecifier
  );

  // validate import type (only support ImportDefaultSpecifier)
  if (!importDefaultSpecifierNode) {
    throw path.buildCodeFrameError('no import specifier');
  } else if (path.node.specifiers.some(e => !t.isImportDefaultSpecifier(e))) {
    throw path.buildCodeFrameError('only support ImportDefaultSpecifier');
  }

  // get matched loader
  const filePath = resolve(dirname(state.filename), path.node.source.value);
  const matchedLoader = validOptions.rules.find(currentLoader => {
    return currentLoader.test.some(e => e.test(filePath));
  });

  if (!matchedLoader) return;

  // transform import
  const variableName = importDefaultSpecifierNode.local.name;
  const ast = generateImportAst(
    variableName,
    filePath,
    getTransformFuncUUID(matchedLoader, transformFuncUUIDCache)
  );
  path.replaceWithMultiple(ast);
};

/**
 * run on program exit, inject used transform functions
 * @param path
 */
const ProgramExit = (path, { transformFuncUUIDCache }) => {
  const astArray = transformFuncUUIDCache.map(currentItem => {
    return template.ast(
      `const ${currentItem.transformFuncUUID} = ${currentItem.transformFunc}`
    );
  });

  path.unshiftContainer('body', astArray);
};

export default babel => {
  // used to store
  const transformFuncUUIDCache = [];
  return {
    name: 'babel-plugin-transform-imports-with-loader',
    visitor: {
      Program: {
        exit: (path, _) => {
          ProgramExit(path, { transformFuncUUIDCache });
        },
      },
      ImportDeclaration: (path, state) => {
        ImportDeclaration(path, state, { babel, transformFuncUUIDCache });
      },
    },
    post() {
      // print out transformFuncUUIDCache
      // console.log('transformFuncUUIDCache', transformFuncUUIDCache);
    },
  };
};
