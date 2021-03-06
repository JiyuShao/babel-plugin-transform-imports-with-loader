import fs from 'fs';
import path from 'path';
import { transform, transformFileSync } from '@babel/core';
import plugin from '../src/index';

describe('babel-plugin-transform-imports-with-loader', () => {
  it('`plugin` should throw error when using transform(cannot find entry file path)', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, './fixtures/import-as-string/index.js'),
      'utf-8'
    );
    const transformedCode = () =>
      transform(code, {
        plugins: [
          [
            plugin,
            {
              rules: {
                test: /\.txt/,
                // unserializeFunc: 'String', // default is string
              },
            },
          ],
        ],
      });

    expect(transformedCode).toThrow();
  });

  it('`plugin` should work with import as text variable', () => {
    const transformedCode = transformFileSync(
      path.resolve(__dirname, './fixtures/import-as-string/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: {
                test: /\.txt/,
                // unserializeFunc: 'String', // default is string
              },
            },
          ],
        ],
      }
    );
    const result = transformedCode ? transformedCode.code || '' : '';

    expect(result.includes('this is test string')).toBe(true);
  });

  it('`plugin` should not transform when no test matched', () => {
    const transformedCode = transformFileSync(
      path.resolve(__dirname, './fixtures/import-as-string/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: {
                test: /\.notmatched/,
              },
            },
          ],
        ],
      }
    );
    const result = transformedCode ? transformedCode.code || '' : '';

    expect(result.includes('this is test string')).toBe(false);
  });

  it('`plugin` should work with test string', () => {
    const transformedCode = transformFileSync(
      path.resolve(__dirname, './fixtures/import-as-string/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: {
                test: '\\.txt',
              },
            },
          ],
        ],
      }
    );
    const result = transformedCode ? transformedCode.code || '' : '';

    expect(result.includes('this is test string')).toBe(true);
  });

  it('`plugin` should work with `rules[]`', () => {
    const transformedCode = transformFileSync(
      path.resolve(__dirname, './fixtures/import-from-different-file/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: [
                {
                  test: /\.txt/,
                  unserializeFunc: 'String',
                },
                {
                  test: /\.txt2/,
                  unserializeFunc: 'String',
                },
              ],
            },
          ],
        ],
      }
    );
    const result = transformedCode ? transformedCode.code || '' : '';

    expect(result.includes('this is test string1')).toBe(true);
    expect(result.includes('this is test string2')).toBe(true);
  });

  it('`plugin` should work with `rules.test[]`', () => {
    const transformedCode = transformFileSync(
      path.resolve(__dirname, './fixtures/import-from-different-file/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: [
                {
                  test: [/\.txt/, /\.txt2/],
                  unserializeFunc: 'String',
                },
              ],
            },
          ],
        ],
      }
    );
    const result = transformedCode ? transformedCode.code || '' : '';

    expect(result.includes('this is test string1')).toBe(true);
    expect(result.includes('this is test string2')).toBe(true);
  });

  it('`plugin` should not throw error when import is not matched', () => {
    const testTransformedCode = jest.fn(() => {
      transformFileSync(
        path.resolve(__dirname, './fixtures/no-import-default/index.js'),
        {
          plugins: [
            [
              plugin,
              {
                rules: {
                  test: /\.txt2/,
                  unserializeFunc: 'String',
                },
              },
            ],
          ],
        }
      );
    });

    testTransformedCode();
    expect(testTransformedCode).toHaveReturned();
  });

  it('`plugin` should throw error when is no default import', () => {
    const testTransformedCode = () => {
      transformFileSync(
        path.resolve(__dirname, './fixtures/no-import-default/index.js'),
        {
          plugins: [
            [
              plugin,
              {
                rules: {
                  test: /\.txt/,
                  unserializeFunc: 'String',
                },
              },
            ],
          ],
        }
      );
    };

    expect(testTransformedCode).toThrow();
  });

  it('`plugin` should throw error when is not default import only', () => {
    const testTransformedCode = () => {
      transformFileSync(
        path.resolve(__dirname, './fixtures/not-import-default-only/index.js'),
        {
          plugins: [
            [
              plugin,
              {
                rules: {
                  test: /\.txt/,
                  unserializeFunc: 'String',
                },
              },
            ],
          ],
        }
      );
    };

    expect(testTransformedCode).toThrow();
  });

  it('`plugin` should throw error when `rules.transform` is not Function', () => {
    const testTransformedCode = () => {
      transformFileSync(
        path.resolve(__dirname, './fixtures/import-as-string/index.js'),
        {
          plugins: [
            [
              plugin,
              {
                rules: {
                  test: /\.txt/,
                  transform: 'this is not a function',
                },
              },
            ],
          ],
        }
      );
    };

    expect(testTransformedCode).toThrow();
  });

  it('`plugin` should throw error when `rules.unserializeFunc` is not valid function string', () => {
    const testTransformedCode = () => {
      transformFileSync(
        path.resolve(__dirname, './fixtures/import-as-string/index.js'),
        {
          plugins: [
            [
              plugin,
              {
                rules: {
                  test: /\.txt/,
                  unserializeFunc: 'this is not function string',
                },
              },
            ],
          ],
        }
      );
    };

    expect(testTransformedCode).toThrow();
  });

  it('`plugin` should not cache unserializeFunc eval function', () => {
    const transformedCode = transformFileSync(
      path.resolve(__dirname, './fixtures/import-as-function/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: {
                test: /\.js/,
                unserializeFunc: 'eval', // default is string
              },
            },
          ],
        ],
      }
    );
    const result = transformedCode ? transformedCode.code || '' : '';

    expect(result.includes('__BABEL_TRANSFORM_IMPORTS__')).toBe(false);
  });
});
