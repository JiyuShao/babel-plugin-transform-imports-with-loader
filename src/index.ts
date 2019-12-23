/*
 * babel-plugin-transform-imports-with-loader
 * @Author: Jiyu Shao
 * @Date: 2019-12-06 16:52:20
 * @Last Modified by: Jiyu Shao
 * @Last Modified time: 2019-12-20 10:49:18
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
 * loader options test param
 */
export type TestOption = RegExp | string;

/**
 * loader options
 */
export interface LoaderOptions {
  // test file path to use current plugin
  test: TestOption[];

  // transform file content to serialized string
  transform?: (fileContent: string, filePath: string) => string;

  // custom unserialize function
  unserializeFunc?: string;
}

/**
 * get valid RegExp from RegExp or string
 * @param {TestOption} regExp
 * @param path
 * @returns {RegExp}
 */
const getValidRegExp = (regExp: TestOption) => {
  if (regExp instanceof RegExp) {
    return regExp;
  }
  return new RegExp(regExp);
};

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
  const parsedRulesArray = rulesArray.map(currentLoader => {
    const { test, transform, unserializeFunc } = currentLoader;
    // get testArray from test
    let testArray: TestOption[];
    if (!Array.isArray(test)) {
      testArray = [test];
    } else {
      testArray = test;
    }

    // validate transform function
    if (transform && !(transform instanceof Function)) {
      throw path.buildCodeFrameError(
        '[options.rules] transform is not function'
      );
    }

    // validate option unserialize
    try {
      unserializeFunc && eval(unserializeFunc)();
    } catch (e) {
      throw path.buildCodeFrameError(
        '[options.rules] unserializeFunc is not function string'
      );
    }

    return {
      test: testArray.map(e => getValidRegExp(e)),
      transform: transform || String,
      unserializeFunc: unserializeFunc || 'String',
    };
  });

  return { rules: parsedRulesArray };
};

/**
 * get unserializeFuncUUID by unserializeFunc
 */
const getunserializeFuncUUID = (matchedLoader, unserializeFuncUUIDCache) => {
  const matchedLoaderCache = unserializeFuncUUIDCache.find(
    e => e.unserializeFunc === matchedLoader.unserializeFunc
  );
  if (matchedLoaderCache) {
    return matchedLoaderCache.unserializeFuncUUID;
  }

  // eval Indirect call will use global scope
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
  if (matchedLoader.unserializeFunc === 'eval') {
    return 'eval';
  }

  const uuid =
    Math.random()
      .toString(36)
      .substring(2) + Date.now().toString(36);
  matchedLoader.unserializeFuncUUID = `__BABEL_TRANSFORM_IMPORTS__${uuid}`;
  unserializeFuncUUIDCache.push({
    unserializeFunc: matchedLoader.unserializeFunc,
    unserializeFuncUUID: matchedLoader.unserializeFuncUUID,
  });
  return matchedLoader.unserializeFuncUUID;
};

/**
 * import declaration function extra options
 */
interface ImportDeclarationOptions {
  // plugin babel variable
  babel: Record<string, any>;

  // unserialize function uuid maping cache
  unserializeFuncUUIDCache: UnserializeFuncUUIDCacheItem[];
}

/**
 * handle babel import declaration transform
 * @param path
 * @param state
 * @param babel
 */
const ImportDeclaration = (
  path,
  state,
  { babel: { types: t }, unserializeFuncUUIDCache }: ImportDeclarationOptions
) => {
  // get validate options
  const validOptions = validateOptions(state.opts, path);

  // get matched loader
  if (!state.file.opts.filename) {
    throw path.buildCodeFrameError('cannot find entry file path');
  }
  const filePath = resolve(
    dirname(state.file.opts.filename),
    path.node.source.value
  );
  const matchedLoader = validOptions.rules.find(currentLoader => {
    return currentLoader.test.some(e => e.test(filePath));
  });
  if (!matchedLoader) return;

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

  // transform import
  const variableName = importDefaultSpecifierNode.local.name;
  let fileContent = fs.readFileSync(filePath, {
    encoding: 'utf8',
  });
  // pass fileContent and filePath to transform func to allow transform to custom serializer
  fileContent = matchedLoader.transform(fileContent.trim(), filePath);

  const unserializeFuncUUID = getunserializeFuncUUID(
    matchedLoader,
    unserializeFuncUUIDCache
  );
  const codeString = dedent`
  const ${variableName} = ${unserializeFuncUUID}(\`${fileContent}\`)
  `;

  const ast = template.ast(codeString);
  path.replaceWithMultiple(ast);
};

/**
 * program exit function extra options
 */
interface ProgramExitOptions {
  unserializeFuncUUIDCache: UnserializeFuncUUIDCacheItem[];
}

/**
 * run on program exit, inject used unserialize functions
 * @param path
 */
const ProgramExit = (
  path,
  { unserializeFuncUUIDCache }: ProgramExitOptions
) => {
  const astArray = unserializeFuncUUIDCache.map(currentItem => {
    return template.ast(
      `const ${currentItem.unserializeFuncUUID} = ${currentItem.unserializeFunc}`
    );
  });

  path.unshiftContainer('body', astArray);
};

/**
 * unserialize function & uuid mapping item
 */
interface UnserializeFuncUUIDCacheItem {
  unserializeFunc: string;
  unserializeFuncUUID: string;
}

export default (babel: Record<string, any>) => {
  // used to store
  const unserializeFuncUUIDCache: UnserializeFuncUUIDCacheItem[] = [];
  return {
    name: 'babel-plugin-transform-imports-with-loader',
    visitor: {
      Program: {
        exit: (path: Record<string, any>) => {
          ProgramExit(path, { unserializeFuncUUIDCache });
        },
      },
      ImportDeclaration: (
        path: Record<string, any>,
        state: Record<string, any>
      ) => {
        ImportDeclaration(path, state, { babel, unserializeFuncUUIDCache });
      },
    },
    post() {
      // print out unserializeFuncUUIDCache
      // console.log('unserializeFuncUUIDCache', unserializeFuncUUIDCache);
    },
  };
};
