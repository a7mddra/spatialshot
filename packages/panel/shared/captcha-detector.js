export class CaptchaDetector {
  static CAPTCHA_INDICATORS = [
    'captcha',
    'recaptcha',
    'g-recaptcha',
    'hcaptcha',
    'funcaptcha',
  ];

  static async checkForCaptcha(webview) {
    const script = `
      (() => {
        const CAPTCHA_INDICATORS = ${JSON.stringify(this.CAPTCHA_INDICATORS)};
        const hasUrlCaptcha = CAPTCHA_INDICATORS.some(indicator =>
          window.location.href.includes(indicator)
        );
        if (hasUrlCaptcha) return true;

        const captchaSelectors = [
          '.g-recaptcha', '#recaptcha', '[src*="recaptcha"]', '[src*="captcha"]',
          'iframe[src*="google.com/recaptcha"]', 'iframe[src*="hcaptcha.com"]',
          'iframe[src*="funcaptcha"]', 'div[data-hcaptcha-sitekey]', '.captcha',
          '.h-captcha', 'img[src*="captcha"]', '#px-captcha'
        ];
        const hasDomCaptcha = captchaSelectors.some(selector => !!document.querySelector(selector));
        if (hasDomCaptcha) return true;

        try {
          const captchaText = document.body.innerText.toLowerCase();
          const hasTextCaptcha = CAPTCHA_INDICATORS.some(indicator =>
            captchaText.includes(indicator)
          );
          if (hasTextCaptcha) return true;
        } catch(e) {
          // body may not be available
        }

        const hasCaptchaMeta = !!document.querySelector('meta[name*="captcha"], meta[content*="captcha"]');
        return hasCaptchaMeta;
      })();
    `;
    try {
      return await webview.executeJavaScript(script);
    } catch (error) {
      console.warn('CAPTCHA detection failed:', error);
      return false;
    }
  }

  static async getCaptchaType(webview) {
    const script = `
      (() => {
        if (document.querySelector('.g-recaptcha, .rc-anchor, iframe[src*="google.com/recaptcha"]'))
          return 'reCAPTCHA';
        if (document.querySelector('.h-captcha, iframe[src*="hcaptcha.com"]'))
          return 'hCaptcha';
        if (document.querySelector('iframe[src*="funcaptcha"], iframe[src*="arkoselabs"]'))
          return 'FunCaptcha';
        if (document.querySelector('#px-captcha'))
          return 'PerimeterX';
        return 'Unknown';
      })();
    `;
    try {
      return await webview.executeJavaScript(script);
    } catch (error) {
      console.warn('Failed to get CAPTCHA type:', error);
      return 'Unknown';
    }
  }

  static monitorForCaptcha(webview, callback, interval = 2000) {
    let captchaDetected = false;

    const intervalId = setInterval(async () => {
      const hasCaptcha = await this.checkForCaptcha(webview);

      if (hasCaptcha && !captchaDetected) {
        captchaDetected = true;
        const captchaType = await this.getCaptchaType(webview);
        callback(true, captchaType);
      } else if (!hasCaptcha && captchaDetected) {
        captchaDetected = false;
        callback(false, null);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }
}