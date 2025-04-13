# CSS Structure

## Important Notes

1. **All CSS files should be in this directory (`src/css/`)**
2. Do NOT place CSS files in `src/_includes/css/` to avoid passthrough copy conflicts

## How CSS is Processed

The main entry point for CSS is `styles.css`, which imports other CSS modules.

During the build:
1. The file is processed through the `beforeBuild` hook in `.eleventy.js`
2. All `@import` statements are resolved
3. The compiled CSS is output to `_site/css/styles.css`

## Adding New CSS

To add new CSS functionality:
1. Create a new CSS file in this directory
2. Import it in `styles.css` using `@import "your-file.css";`

## CSS Files Organization

- `reset.css`: CSS reset styles
- `variables.css`: CSS custom properties
- `typography.css`: Text and font styling
- `global.css`: Global element styling
- `utils.css`: Utility classes
- `components.css`: Reusable component styles
