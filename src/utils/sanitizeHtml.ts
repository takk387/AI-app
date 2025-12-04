export function sanitizeHtml(html: string): string {
  // Simple sanitization function to prevent XSS
  return (
    html
      // Remove script tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove onclick and other event handlers
      .replace(/ on\w+="[^"]*"/g, '')
      // Remove javascript: URLs
      .replace(/javascript:[^\s'"]+/g, '')
      // Remove data: URLs
      .replace(/data:[^\s'"]+/g, '')
      // Remove other potentially dangerous attributes
      .replace(
        /(\b)(style|href|src|formaction)(\s*)=(\s*)("[^"]*"|'[^']*'|[^>\s]+)/gi,
        (match, p1, p2) => {
          // Allow style attribute but sanitize its content
          if (p2.toLowerCase() === 'style') {
            const styleValue = match.split('=')[1].trim().slice(1, -1);
            const sanitizedStyle = styleValue
              // Remove potentially dangerous CSS
              .replace(/expression\s*\(.*\)/gi, '')
              .replace(/url\s*\(.*\)/gi, '')
              .replace(/javascript:/gi, '');
            return `style="${sanitizedStyle}"`;
          }
          // Remove other potentially dangerous attributes
          return '';
        }
      )
  );
}
