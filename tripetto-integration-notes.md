# Tripetto Integration Notes

## Embed Options

Tripetto provides several embed types:
1. **Inline with other content (HTML snippet)** - Form placed inline with content using a div element with unique id
2. **Full page (HTML snippet)** - Form covers the whole page
3. **Full page (HTML page)** - Complete HTML page with form
4. **Using JavaScript or TypeScript** - ES6 imports with npm packages

## For React Integration

The best approach for our React website is to use the **HTML snippet inline** method:
- Place a div with a unique Tripetto ID
- Include the Tripetto script that attaches to that div
- Can use jsDelivr or unpkg CDN for scripts

## Implementation Plan

1. Create Tripetto forms in the Tripetto studio:
   - Newsletter signup form (email only)
   - Investor packet request form (name, email, interest)

2. Get embed codes from Tripetto studio

3. For React, we can:
   - Use useEffect to load the Tripetto script dynamically
   - Or use an iframe approach with the Tripetto share link
   - Or embed the script directly in the component

## Key Embed Code Structure

```html
<div id="tripetto-UNIQUE_ID"></div>
<script>
  // Tripetto initialization script
</script>
```

For React, we'll need to handle script loading in useEffect and cleanup on unmount.
