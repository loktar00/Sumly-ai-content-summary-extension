// Simple markdown parser
export const markdownToHtml = (markdown) => {
    return markdown
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')

        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

        // Lists
        .replace(/^\s*\n\*/gm, '<ul>\n*')
        .replace(/^(\*.+)\s*\n([^*])/gm, '$1\n</ul>\n$2')
        .replace(/^\*(.+)/gm, '<li>$1</li>')

        // Ordered Lists
        .replace(/^\s*\n\d\./gm, '<ol>\n1.')
        .replace(/^(\d\..+)\s*\n([^\d.])/gm, '$1\n</ol>\n$2')
        .replace(/^\d\.(.+)/gm, '<li>$1</li>')

        // Blockquotes
        .replace(/^>(.+)/gm, '<blockquote>$1</blockquote>')

        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code><p>$1</p></code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Paragraphs
        .replace(/^\s*(\n)?(.+)/gm, function(m) {
            return /<(\/)?(h\d|ul|ol|li|blockquote|pre|code)/.test(m) ? m : '<p>'+m+'</p>';
        })
};