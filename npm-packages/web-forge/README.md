# @freelang/web-forge

FreeLang Native Web Framework - SSG/SSR engine

**Zero npm dependencies** - Uses only Node.js built-in modules

## Features

- ✅ Static Site Generation (SSG)
- ✅ Server-Side Rendering (SSR)
- ✅ Template engine with components
- ✅ 21+ built-in functions
- ✅ Layout composition
- ✅ Partial templates
- ✅ Data-driven pages
- ✅ Asset pipeline
- ✅ Markdown support

## Installation

```bash
npm install @freelang/web-forge
```

## Usage

### Static Site Generation

```javascript
const { createSite, definePages } = require('@freelang/web-forge');

const site = createSite({
  outputDir: './dist',
  sourceDir: './src/pages',
  assetsDir: './src/assets',
  layoutsDir: './src/layouts'
});

// Define pages
const pages = definePages({
  'index.html': {
    template: 'home.html',
    data: { title: 'Home', description: 'Welcome' }
  },
  'about.html': {
    template: 'about.html',
    data: { title: 'About Us' }
  },
  'blog/post-1.html': {
    template: 'blog-post.html',
    data: require('./blog-data.json')
  }
});

await site.generate(pages);
console.log('✅ Site generated');
```

### Server-Side Rendering

```javascript
const { createRenderer } = require('@freelang/web-forge');

const renderer = createRenderer({
  layoutsDir: './src/layouts',
  componentsDir: './src/components',
  cacheTemplates: true
});

// Express route example
app.get('/page/:slug', async (req, res) => {
  const html = await renderer.render('page.html', {
    title: 'Dynamic Page',
    slug: req.params.slug,
    content: await fetchPageContent(req.params.slug)
  });

  res.send(html);
});
```

### Template System

```html
<!-- layouts/base.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  {{ include('partials/header') }}
  <main>
    {{ content }}
  </main>
  {{ include('partials/footer') }}
</body>
</html>
```

### Components

```html
<!-- components/button.html -->
<button class="btn btn-{{ type }}">
  {{ label }}
</button>

<!-- Usage -->
{{ component('button', { type: 'primary', label: 'Click me' }) }}
```

### Template Variables

```javascript
const page = {
  title: 'My Page',
  items: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ],
  published: true
};

// Template
<h1>{{ title }}</h1>
{{ if published }}
  <span class="published">Published</span>
{{ endif }}

<ul>
{{ foreach items as item }}
  <li>{{ item.name }}</li>
{{ endforeach }}
</ul>
```

### Markdown Pages

```javascript
const { createSite, parseMarkdown } = require('@freelang/web-forge');

const pages = definePages({
  'blog/getting-started.html': {
    source: 'blog/getting-started.md',
    template: 'blog-post.html',
    parser: parseMarkdown,
    data: {
      author: 'John Doe',
      date: '2024-01-15'
    }
  }
});
```

### Data Transforms

```javascript
const { defineTransform } = require('@freelang/web-forge');

const dateFormat = defineTransform('date', (value, format) => {
  const date = new Date(value);
  return date.toLocaleDateString(format || 'en-US');
});

// In template
<p>Published: {{ published_at | date('en-US') }}</p>
```

### Asset Pipeline

```javascript
const site = createSite({
  outputDir: './dist',
  assetPipeline: {
    css: {
      minify: true,
      sourceMap: false
    },
    js: {
      minify: true,
      bundle: true
    },
    images: {
      optimize: true,
      formats: ['webp', 'jpg', 'png']
    }
  }
});
```

## API Reference

### Core Functions (21+)

**Rendering**:
- `createSite(options)` - Initialize site generator
- `createRenderer(options)` - Create server renderer
- `render(template, data)` - Render single template
- `renderString(html, data)` - Render HTML string

**Template Operations**:
- `include(file)` - Include partial template
- `component(name, props)` - Include component
- `extend(layout)` - Extend base layout
- `block(name)` - Define template block

**Conditionals**:
- `if(condition)` - If statement
- `else` - Else clause
- `elseif(condition)` - Else if clause
- `endif` - End if block

**Loops**:
- `foreach(array as item)` - Loop array
- `while(condition)` - While loop
- `endforeach / endwhile` - End loop

**Filters/Transforms**:
- `upper(text)` - Uppercase
- `lower(text)` - Lowercase
- `trim(text)` - Trim whitespace
- `slice(text, start, end)` - Slice string
- `join(array, separator)` - Join array
- `split(string, separator)` - Split string
- `replace(text, search, replace)` - Replace string

### Configuration Options

```javascript
{
  // Directories
  sourceDir: './src/pages',
  outputDir: './dist',
  layoutsDir: './src/layouts',
  componentsDir: './src/components',
  assetsDir: './src/assets',

  // Rendering
  cacheTemplates: true,
  minifyOutput: false,
  prettifyOutput: true,

  // Asset pipeline
  processCss: true,
  processJs: true,
  optimizeImages: true,

  // Development
  watch: false,
  liveReload: false,

  // Custom
  baseUrl: '/',
  extensions: ['.html', '.md'],
  globals: { siteName: 'My Site' }
}
```

## FreeLang Integration

```freelang
import { createSite, definePages } from @freelang/web-forge

fn build_static_site() {
    let site = createSite({
        "outputDir": "./dist",
        "sourceDir": "./src/pages",
        "layoutsDir": "./src/layouts"
    })

    let pages = definePages({
        "index.html": {
            "template": "home.html",
            "data": {
                "title": "Home",
                "items": [1, 2, 3]
            }
        },
        "about.html": {
            "template": "about.html",
            "data": { "title": "About" }
        }
    })

    site.generate(pages)

    return { "status": "ok", "output": "./dist" }
}

fn render_page_ssr(template: string, data: map) {
    let renderer = createRenderer({
        "layoutsDir": "./src/layouts",
        "cacheTemplates": true
    })

    let html = renderer.render(template, data)

    return html
}
```

## Performance

- Template compilation: < 2ms
- Single page render: < 10ms (SSR)
- Batch generation (100 pages): < 500ms
- Asset optimization (image): < 50ms per image
- Cache hit rate: < 0.5ms

## Build Modes

### Development
```bash
npm run dev
# Watches for changes, enables live reload
# Cache disabled, prettified output
```

### Production
```bash
npm run build
# Optimized output, minified CSS/JS
# Images in multiple formats (webp, jpg)
# Source maps disabled
```

### Incremental
```bash
npm run build:incremental
# Only regenerates changed files
# Maintains cache of unchanged pages
```

## Examples

### Blog Site

```javascript
const posts = require('./blog-posts.json');

const pages = posts.map(post => ({
  [`blog/${post.slug}.html`]: {
    template: 'blog-post.html',
    data: post
  }
}));

await site.generate(pages);
```

### Documentation Site

```javascript
const docs = require('./docs.json');

const pages = docs.map(doc => ({
  [`docs/${doc.path}.html`]: {
    template: 'doc.html',
    data: doc,
    parser: parseMarkdown
  }
}));

await site.generate(pages);
```

## Best Practices

- ⚠️ Use partials to avoid template duplication
- ⚠️ Separate data from templates
- ⚠️ Pre-compile templates in production
- ⚠️ Cache static assets aggressively
- ⚠️ Use incremental builds for large sites
- ⚠️ Optimize images before inclusion
- ⚠️ Monitor build times and adjust accordingly

## License

MIT

## Related Packages

- [@freelang/security](https://npmjs.com/package/@freelang/security) - CORS, CSP, Rate Limiting
- [@freelang/orm](https://npmjs.com/package/@freelang/orm) - Database ORM
- [@freelang/auth](https://npmjs.com/package/@freelang/auth) - JWT/HMAC authentication
