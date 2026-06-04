
import nodeResolve    from '@rollup/plugin-node-resolve';
import commonjs       from '@rollup/plugin-commonjs';
import { visualizer } from "rollup-plugin-visualizer";
import dts            from 'rollup-plugin-dts';





const es_config = {

  input: 'build/ts/index.js',

  output: {
    file      : 'build/rollup/index.mjs',
    format    : 'es',
    name      : 'fsl.tools',
    sourcemap : true
  },

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.ts' ],
      preferBuiltins : false
    }),

    commonjs(),

    visualizer({ filename: "build/rollup/visualizations/bundle_sunburst.html",   template: "sunburst" }),
    visualizer({ filename: "build/rollup/visualizations/bundle_treemap.html",    template: "treemap" }),
    visualizer({ filename: "build/rollup/visualizations/bundle_network.html",    template: "network" }),
    visualizer({ filename: "build/rollup/visualizations/bundle_flamegraph.html", template: "flamegraph" })

  ]

};





const cjs_config = {

  input: 'build/ts/index.js',

  output: {
    file      : 'build/rollup/index.cjs',
    format    : 'commonjs',
    name      : 'fsl.tools',
    sourcemap : true
  },

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.ts' ],
      preferBuiltins : false
    }),

    commonjs()

  ]

};





const iife_config = {

  input: 'build/ts/index.js',

  output: {
    file      : 'build/rollup/index.iife.js',
    format    : 'iife',
    name      : 'fsl.tools',
    sourcemap : true
  },

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.ts' ],
      preferBuiltins : false
    }),

    commonjs()

  ]

};





// const cli_config = {

//   input: 'build/ts/cli.js',

//   output: {
//     file   : 'build/rollup/cli.cjs',
//     format : 'commonjs',
//     banner : '#!/usr/bin/env node',
//     name   : 'fsl.tools-cli'
//   },

//   plugins : [

//     nodeResolve({
//       mainFields     : ['module', 'main'],
//       browser        : false,
//       extensions     : [ '.ts', '.js' ],
//       preferBuiltins : true
//     }),

//     commonjs(),

//     visualizer()

//   ]

// };




// Emits the CommonJS .d.cts declaration that used to live in
// rollup.ctsphase.config.js. Input is the freshly-emitted .d.ts from
// `tsc --build` (build/ts/index.d.ts), so this config does not need
// to wait for the build chain's `dts` step to copy declarations into
// dist/ — it can run in the same Rollup invocation as the bundlers.
const cjs_cts = {

  input: 'build/ts/index.d.ts',

  output: {
    file   : './dist/index.d.cts',
    format : 'es'
  },

  plugins : [ dts() ]

};



export default [ es_config, cjs_config, iife_config, cjs_cts ];  // , cli_config ];
