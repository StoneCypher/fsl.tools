module.exports = {
  name: 'fsl.tools',
  readme: './README.md',
  out: 'docs/docs',
  plugin: [ 'typedoc-plugin-coverage' ],
  coverageOutputPath: './coverage-typedoc/coverage-typedoc.json',
  coverageOutputType: 'json',
  // entryPoints: [ 'packages/*' ],
  // customCss: './src/site/typedoc-addon.css',
  // entryPointStrategy: 'packages',
  excludePrivate: true
};