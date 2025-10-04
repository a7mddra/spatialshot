/**
 * Injects detailed prompt after image upload is complete
 */
export function injectAIPrompt(webview) {
  const promptScript = `
    (function() {
      const DETAILED_PROMPT = "Provide a comprehensive overview of this image. Describe the main subjects, composition, text content (if any), and overall context. Be detailed and analytical in your assessment.";
      
      function injectPrompt() {
        const selectors = [
          'textarea[aria-label*="Ask"]',
          'textarea[placeholder*="ask"]', 
          'textarea[role="textbox"]',
          'input[type="text"]',
          'textarea'
        ];
        
        let input = null;
        for (const selector of selectors) {
          input = document.querySelector(selector);
          if (input) break;
        }
        
        if (input) {
          input.focus();
          input.value = DETAILED_PROMPT;
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          const form = input.closest('form');
          if (form) {
            form.submit();
          } else {
            input.dispatchEvent(new KeyboardEvent('keydown', { 
              key: 'Enter', 
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true 
            }));
          }
          
          console.log('AI prompt injected successfully');
          return true;
        }
        return false;
      }
      
      let attempts = 0;
      const maxAttempts = 10;
      
      function attemptInjection() {
        attempts++;
        if (injectPrompt()) {
          return true;
        } else if (attempts < maxAttempts) {
          setTimeout(attemptInjection, 500 + (attempts * 200));
        } else {
          console.log('Failed to inject prompt after', maxAttempts, 'attempts');
          return false;
        }
      }
      
      setTimeout(attemptInjection, 1000);
    })();
  `;
  
  webview.executeJavaScript(promptScript)
    .catch(err => console.warn('Prompt injection failed:', err));
}
