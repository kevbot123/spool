// esbuild.config.js
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Create a custom plugin to handle CSS imports
const cssNullPlugin = {
  name: 'css-null',
  setup(build) {
    // Intercept all CSS imports and replace them with an empty module
    build.onResolve({ filter: /\.css$/ }, args => {
      return {
        path: args.path,
        namespace: 'css-null',
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'css-null' }, () => {
      return {
        contents: 'export default {}',
        loader: 'js',
      };
    });
  },
};

// First, handle the JavaScript bundling
esbuild.build({
  entryPoints: ['src/embed.tsx'],
  bundle: true,
  outfile: 'public/embed/embed.bundle.js',
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  plugins: [cssNullPlugin],
  loader: {
    '.js': 'jsx',
    '.ts': 'tsx',
    '.tsx': 'tsx',
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
})
.then(() => {
  console.log('JavaScript bundling completed successfully!');
})
.catch(error => {
  console.error('Error during JavaScript bundling:', error);
  process.exit(1);
});
