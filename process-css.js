// process-css.js
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

// Ensure the output directory exists
const outputDir = path.join(__dirname, 'public', 'embed');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the input CSS file
const css = fs.readFileSync(path.join(__dirname, 'src', 'app', 'globals.css'), 'utf8');

// Import the project's Tailwind config
let tailwindConfig;
try {
  // Try to require the JavaScript config
  tailwindConfig = require('./tailwind.config.js');
  console.log('Successfully loaded JavaScript Tailwind config');
} catch (error) {
  console.warn('Could not load JavaScript Tailwind config:', error.message);
  // Fallback to a simplified config if the import fails
  tailwindConfig = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
      extend: {},
    },
    plugins: [],
  };
}

console.log('Processing CSS with Tailwind...');

// Process the CSS with PostCSS (Tailwind + Autoprefixer + Minification)
console.log('Using Tailwind config with content paths:', tailwindConfig.content);
postcss([
  tailwindcss(tailwindConfig),
  autoprefixer(),
  cssnano({ preset: 'default' })
])
  .process(css, { 
    from: 'src/app/globals.css', 
    to: 'public/embed/embed.bundle.css' 
  })
  .then(result => {
    // Write the processed CSS to the output file
    fs.writeFileSync(path.join(outputDir, 'embed.bundle.css'), result.css);
    if (result.map) {
      fs.writeFileSync(path.join(outputDir, 'embed.bundle.css.map'), result.map.toString());
    }
    console.log('CSS processing completed successfully!');
  })
  .catch(error => {
    console.error('Error processing CSS:', error);
    process.exit(1);
  });