import path from 'path';
import { transformFileSync } from '@babel/core';
import plugin from '../src/index';

describe('babel-plugin-transform-imports-with-loader', () => {
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
                // transformFunc: 'String', // default is string
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
                  transformFunc: 'String',
                },
                {
                  test: /\.txt2/,
                  transformFunc: 'String',
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
                  transformFunc: 'String',
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

  it('`plugin` should throw error when is not default import only', () => {
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
                  transformFunc: 'String',
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
                  transformFunc: 'String',
                },
              },
            ],
          ],
        }
      );
    };

    expect(testTransformedCode).toThrow();
  });
});

it('`plugin` should throw error when `rules.test` is not RegExp', () => {
  const testTransformedCode = () => {
    transformFileSync(
      path.resolve(__dirname, './fixtures/import-as-string/index.js'),
      {
        plugins: [
          [
            plugin,
            {
              rules: {
                test: 'this is not valid RegExp',
              },
            },
          ],
        ],
      }
    );
  };

  expect(testTransformedCode).toThrow();
});

it('`plugin` should throw error when `rules.transformFunc` is not valid function string', () => {
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
                transformFunc: 'this is not function string',
              },
            },
          ],
        ],
      }
    );
  };

  expect(testTransformedCode).toThrow();
});
