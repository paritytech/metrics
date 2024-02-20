export const generateSite = (name: string, content: string) => `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Metrics for ${name}</title>
    </head>
    
    <body>
        ${content}
    </body>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.8.0/dist/mermaid.min.js"></script>
    
    </html>`;
