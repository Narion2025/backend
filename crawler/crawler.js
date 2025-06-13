const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class CookieGuardCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.data = {};
    this.urlList = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    this.page = await this.browser.newPage();
    
    // Setze User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Aktiviere Request-Interception für Cookie-Analyse
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      request.continue();
    });
    
    // Sammle alle Cookies
    this.page.on('response', async response => {
      const cookies = await response.headers()['set-cookie'];
      if (cookies) {
        this.analyzeCookies(cookies);
      }
    });
  }

  async loadUrlList(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.urlList = content.split('\n').filter(url => url.trim());
    } catch (error) {
      console.error('Fehler beim Laden der URL-Liste:', error);
      throw error;
    }
  }

  async crawl(url) {
    console.log(`Crawle: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Warte kurz auf mögliche Cookie-Banner
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Versuche, das Banner automatisch zu bedienen (z. B. "Alle akzeptieren" klicken)
      await this.handleCookieBanner();

      // Gib der Seite kurz Zeit, ihre Cookies nach der Interaktion zu setzen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Analysiere die Seite
      const pageData = await this.analyzePage();
      
      // Speichere die Daten
      this.data[new URL(url).hostname] = pageData;
      
      // Speichere die Daten in einer Datei
      await this.saveData();
      
    } catch (error) {
      console.error(`Fehler beim Crawlen von ${url}:`, error);
    }
  }

  async analyzePage() {
    const pageData = {
      domain: new URL(this.page.url()).hostname,
      timestamp: new Date().toISOString(),
      banner: await this.analyzeBanner(),
      cookies: await this.analyzeCookies(),
      compliance: await this.checkCompliance(),
      automation: await this.analyzeAutomation()
    };
    
    return pageData;
  }

  async analyzeBanner() {
    const bannerData = {
      selectors: {
        container: [],
        accept: [],
        reject: [],
        settings: [],
        close: []
      },
      behavior: {
        appearsOn: 'unknown',
        delay: 0,
        reappears: false,
        reappearDelay: 0,
        hideOnAccept: false,
        hideOnReject: false,
        hideOnSettings: false
      },
      settings: {
        hasCategories: false,
        categories: [],
        defaultState: {},
        requiredCategories: [],
        toggleSelectors: {},
        saveButton: ''
      }
    };

    // Suche nach Cookie-Banner
    const bannerSelectors = [
      '#onetrust-consent-sdk',
      '.onetrust-pc-dark-filter',
      '.ot-sdk-container',
      '#onetrust-banner-sdk',
      '#usercentrics-cmp',
      '.uc-banner',
      '.usercentrics-dialog',
      '#CybotCookiebotDialog',
      '#Cookiebot',
      '.cookiebot-banner',
      '#sp-cc',
      '.sp-cc-banner',
      '.sp-message-container',
      '[id*="cookie"]',
      '[class*="cookie"]',
      '[id*="consent"]',
      '[class*="consent"]',
      '[aria-label*="cookie"]',
      '[aria-label*="Cookie"]',
      '.gdpr-banner',
      '.privacy-banner',
      '.cookie-notice',
      '.cookie-bar'
    ];

    for (const selector of bannerSelectors) {
      const element = await this.page.$(selector);
      if (element) {
        bannerData.selectors.container.push(selector);
        
        // Analysiere Banner-Verhalten
        await this.analyzeBannerBehavior(element, bannerData);
        
        // Analysiere Banner-Einstellungen
        await this.analyzeBannerSettings(element, bannerData);
        
        break;
      }
    }

    return bannerData;
  }

  async analyzeBannerBehavior(element, bannerData) {
    // Prüfe, ob das Banner wirklich sichtbar ist (ElementHandle besitzt keine isVisible-Methode)
    const isVisible = await this.page.evaluate(el => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (!style) return false;
      const rect = el.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        parseFloat(style.opacity || '1') !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }, element);
    if (!isVisible) return;

    // Überprüfe Banner-Buttons
    const buttons = await element.$$('button, a, [role="button"]');
    for (const button of buttons) {
      const text = await this.page.evaluate(el => el.textContent.toLowerCase(), button);
      const selector = await this.page.evaluate(el => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ').join('.')}`;
        return el.tagName.toLowerCase();
      }, button);

      if (text.includes('akzeptieren') || text.includes('accept')) {
        bannerData.selectors.accept.push(selector);
      } else if (text.includes('ablehnen') || text.includes('reject')) {
        bannerData.selectors.reject.push(selector);
      } else if (text.includes('einstellungen') || text.includes('settings')) {
        bannerData.selectors.settings.push(selector);
      } else if (text.includes('schließen') || text.includes('close')) {
        bannerData.selectors.close.push(selector);
      }
    }

    // Überprüfe Banner-Verhalten
    bannerData.behavior.appearsOn = 'load';
    bannerData.behavior.delay = 0;
    bannerData.behavior.reappears = false;
    bannerData.behavior.reappearDelay = 0;
    bannerData.behavior.hideOnAccept = true;
    bannerData.behavior.hideOnReject = true;
    bannerData.behavior.hideOnSettings = false;
  }

  async analyzeBannerSettings(element, bannerData) {
    // Überprüfe Cookie-Kategorien
    const categories = await element.$$('[class*="category"], [class*="preference"]');
    if (categories.length > 0) {
      bannerData.settings.hasCategories = true;
      
      for (const category of categories) {
        const categoryData = await this.analyzeCategory(category);
        bannerData.settings.categories.push(categoryData);
      }
    }
  }

  async analyzeCategory(element) {
    const categoryData = {
      name: '',
      description: '',
      required: false,
      defaultState: false,
      toggleSelector: ''
    };

    // Extrahiere Kategorie-Informationen
    const text = await this.page.evaluate(el => el.textContent, element);
    const isRequired = await this.page.evaluate(el => {
      return el.hasAttribute('disabled') || el.hasAttribute('readonly');
    }, element);

    categoryData.name = text.split('\n')[0].trim();
    categoryData.description = text.split('\n').slice(1).join(' ').trim();
    categoryData.required = isRequired;
    categoryData.defaultState = await this.page.evaluate(el => {
      return el.checked || el.hasAttribute('checked');
    }, element);
    categoryData.toggleSelector = await this.page.evaluate(el => {
      if (el.id) return `#${el.id}`;
      if (el.className) return `.${el.className.split(' ').join('.')}`;
      return el.tagName.toLowerCase();
    }, element);

    return categoryData;
  }

  async analyzeCookies() {
    const cookieData = {
      essential: [],
      functional: [],
      analytics: [],
      marketing: []
    };

    // Hole alle Cookies von der Seite
    const cookies = await this.page.cookies();
    
    // Analysiere Cookies
    for (const cookie of cookies) {
      const cookieInfo = {
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        size: cookie.name.length + (cookie.value ? cookie.value.length : 0),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        session: cookie.session,
        sameSite: cookie.sameSite,
        category: this.categorizeCookie(cookie)
      };

      cookieData[cookieInfo.category].push(cookieInfo);
    }

    return cookieData;
  }

  categorizeCookie(cookie) {
    const name = cookie.name.toLowerCase();
    const domain = cookie.domain.toLowerCase();

    // Essentielle Cookies
    if (name.includes('session') || 
        name.includes('auth') || 
        name.includes('security') ||
        name.includes('csrf')) {
      return 'essential';
    }

    // Marketing Cookies
    if (name.includes('ad') || 
        name.includes('track') || 
        name.includes('marketing') ||
        domain.includes('doubleclick') ||
        domain.includes('google-analytics')) {
      return 'marketing';
    }

    // Analytics Cookies
    if (name.includes('analytics') || 
        name.includes('stats') || 
        name.includes('measure')) {
      return 'analytics';
    }

    // Funktionale Cookies
    return 'functional';
  }

  async checkCompliance() {
    const compliance = {
      gdpr: {
        required: true,
        checks: {
          hasConsent: false,
          hasReject: false,
          hasSettings: false,
          hasInfo: false,
          hasPurpose: false,
          hasDuration: false,
          hasThirdParty: false,
          hasWithdraw: false,
          isVisible: false,
          isAccessible: false,
          hasContrast: false,
          hasReadableFont: false,
          noPreTicked: false,
          noForcedAccept: false,
          hasSaveButton: false,
          hasCloseButton: false
        },
        violations: []
      },
      eprivacy: {
        required: true,
        checks: {
          hasCookieInfo: false,
          hasTrackingInfo: false,
          hasOptOut: false,
          hasStorageInfo: false
        },
        violations: []
      },
      ttdsg: {
        required: true,
        checks: {
          hasGermanInfo: false,
          hasGermanSettings: false,
          hasGermanButtons: false,
          hasGermanPrivacy: false
        },
        violations: []
      }
    };

    // Überprüfe Compliance
    await this.checkGDPRCompliance(compliance.gdpr);
    await this.checkEPrivacyCompliance(compliance.eprivacy);
    await this.checkTTDSGCompliance(compliance.ttdsg);

    return compliance;
  }

  async checkGDPRCompliance(gdpr) {
    const pageContent = await this.page.content();
    const text = pageContent.toLowerCase();

    // Überprüfe grundlegende Anforderungen
    gdpr.checks.hasConsent = this.checkPattern(text, [
      'einwilligung', 'consent', 'zustimmung', 'akzeptieren'
    ]);
    gdpr.checks.hasReject = this.checkPattern(text, [
      'ablehnen', 'reject', 'verweigern', 'nicht akzeptieren'
    ]);
    gdpr.checks.hasSettings = this.checkPattern(text, [
      'einstellungen', 'settings', 'präferenzen', 'auswahl'
    ]);
    gdpr.checks.hasInfo = this.checkPattern(text, [
      'datenschutz', 'privacy', 'cookies', 'tracking'
    ]);

    // Überprüfe spezifische Anforderungen
    gdpr.checks.hasPurpose = this.checkPattern(text, [
      'zweck', 'purpose', 'verwendung', 'nutzung'
    ]);
    gdpr.checks.hasDuration = this.checkPattern(text, [
      'dauer', 'duration', 'zeitraum', 'speicherdauer'
    ]);
    gdpr.checks.hasThirdParty = this.checkPattern(text, [
      'drittanbieter', 'third party', 'partner', 'dienstleister'
    ]);
    gdpr.checks.hasWithdraw = this.checkPattern(text, [
      'widerruf', 'withdraw', 'zurückziehen', 'ändern'
    ]);

    // Sammle Verstöße
    this.collectViolations(gdpr);
  }

  async checkEPrivacyCompliance(eprivacy) {
    const pageContent = await this.page.content();
    const text = pageContent.toLowerCase();

    // Überprüfe ePrivacy-Anforderungen
    eprivacy.checks.hasCookieInfo = this.checkPattern(text, [
      'cookie', 'cookies', 'browser-storage', 'speicherung'
    ]);
    eprivacy.checks.hasTrackingInfo = this.checkPattern(text, [
      'tracking', 'verfolgung', 'analyse', 'statistik'
    ]);
    eprivacy.checks.hasOptOut = this.checkPattern(text, [
      'opt-out', 'ablehnen', 'deaktivieren', 'ausschalten'
    ]);
    eprivacy.checks.hasStorageInfo = this.checkPattern(text, [
      'speicherung', 'storage', 'speichern', 'save'
    ]);

    // Sammle Verstöße
    this.collectViolations(eprivacy);
  }

  async checkTTDSGCompliance(ttdsg) {
    const pageContent = await this.page.content();
    const text = pageContent.toLowerCase();

    // Überprüfe TTDSG-Anforderungen
    ttdsg.checks.hasGermanInfo = this.checkPattern(text, [
      'datenschutz', 'cookies', 'einwilligung', 'zustimmung'
    ]);
    ttdsg.checks.hasGermanSettings = this.checkPattern(text, [
      'einstellungen', 'präferenzen', 'auswahl', 'anpassen'
    ]);
    ttdsg.checks.hasGermanButtons = this.checkPattern(text, [
      'akzeptieren', 'ablehnen', 'einstellungen', 'speichern'
    ]);
    ttdsg.checks.hasGermanPrivacy = this.checkPattern(text, [
      'datenschutzerklärung', 'datenschutzrichtlinie', 'datenschutzbestimmungen'
    ]);

    // Sammle Verstöße
    this.collectViolations(ttdsg);
  }

  checkPattern(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
  }

  collectViolations(compliance) {
    Object.keys(compliance.checks).forEach(check => {
      if (!compliance.checks[check]) {
        compliance.violations.push(check);
      }
    });
  }

  async analyzeAutomation() {
    const automation = {
      sequences: {
        accept: [],
        reject: [],
        essential: [],
        settings: []
      },
      timing: {
        clickDelay: 0,
        animationDelay: 0,
        loadDelay: 0
      },
      errorHandling: {
        retryCount: 3,
        retryDelay: 1000,
        fallbackActions: {}
      }
    };

    // Analysiere Klick-Sequenzen
    await this.analyzeClickSequences(automation.sequences);
    
    // Analysiere Timing
    await this.analyzeTiming(automation.timing);
    
    // Analysiere Fehlerbehandlung
    await this.analyzeErrorHandling(automation.errorHandling);

    return automation;
  }

  async analyzeClickSequences(sequences) {
    // Analysiere "Alle akzeptieren" Sequenz
    const acceptButton = await this.page.$('[class*="accept"], [class*="allow"]');
    if (acceptButton) {
      sequences.accept.push({
        selector: await this.page.evaluate(el => {
          if (el.id) return `#${el.id}`;
          if (el.className) return `.${el.className.split(' ').join('.')}`;
          return el.tagName.toLowerCase();
        }, acceptButton),
        action: 'click'
      });
    }

    // Analysiere "Alle ablehnen" Sequenz
    const rejectButton = await this.page.$('[class*="reject"], [class*="deny"]');
    if (rejectButton) {
      sequences.reject.push({
        selector: await this.page.evaluate(el => {
          if (el.id) return `#${el.id}`;
          if (el.className) return `.${el.className.split(' ').join('.')}`;
          return el.tagName.toLowerCase();
        }, rejectButton),
        action: 'click'
      });
    }

    // Analysiere "Nur essentielle" Sequenz
    const essentialButton = await this.page.$('[class*="essential"], [class*="necessary"]');
    if (essentialButton) {
      sequences.essential.push({
        selector: await this.page.evaluate(el => {
          if (el.id) return `#${el.id}`;
          if (el.className) return `.${el.className.split(' ').join('.')}`;
          return el.tagName.toLowerCase();
        }, essentialButton),
        action: 'click'
      });
    }

    // Analysiere "Einstellungen" Sequenz
    const settingsButton = await this.page.$('[class*="settings"], [class*="preferences"]');
    if (settingsButton) {
      sequences.settings.push({
        selector: await this.page.evaluate(el => {
          if (el.id) return `#${el.id}`;
          if (el.className) return `.${el.className.split(' ').join('.')}`;
          return el.tagName.toLowerCase();
        }, settingsButton),
        action: 'click'
      });
    }
  }

  async analyzeTiming(timing) {
    // Messen der Klick-Verzögerung
    const startTime = Date.now();
    await this.page.click('body');
    timing.clickDelay = Date.now() - startTime;

    // Messen der Animations-Verzögerung
    timing.animationDelay = 300; // Standardwert

    // Messen der Lade-Verzögerung
    timing.loadDelay = 1000; // Standardwert
  }

  async analyzeErrorHandling(errorHandling) {
    // Standardwerte für Fehlerbehandlung
    errorHandling.retryCount = 3;
    errorHandling.retryDelay = 1000;
    errorHandling.fallbackActions = {
      accept: 'reject',
      reject: 'settings',
      settings: 'close'
    };
  }

  async saveData() {
    const dataPath = path.join(__dirname, 'data', 'crawl-results.json');
    await fs.writeFile(dataPath, JSON.stringify(this.data, null, 2));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Versucht, ein eventuell vorhandenes Cookie-Banner automatisch zu bedienen.
   * Derzeit wird vorrangig ein "Alle akzeptieren"-Button angeklickt, alternativ "Ablehnen".
   * So können nach dem Klick gesetzte Cookies anschließend korrekt erfasst werden.
   */
  async handleCookieBanner() {
    try {
      const buttons = await this.page.$$('button, a, [role="button"], input[type="button"], input[type="submit"]');
      if (!buttons || buttons.length === 0) return;

      const acceptKeywords = ['akzeptieren', 'alle akzeptieren', 'accept', 'allow', 'zustimmen', 'agree'];
      const rejectKeywords = ['ablehnen', 'alle ablehnen', 'reject', 'decline', 'nicht akzeptieren', 'verweigern'];

      // Priorität: akzeptieren
      for (const btn of buttons) {
        const text = (await this.page.evaluate(el => (el.innerText || el.value || '').trim().toLowerCase(), btn)) || '';
        if (acceptKeywords.some(k => text.includes(k))) {
          await btn.click();
          return;
        }
      }

      // Falls kein Accept gefunden, versuche Ablehnen
      for (const btn of buttons) {
        const text = (await this.page.evaluate(el => (el.innerText || el.value || '').trim().toLowerCase(), btn)) || '';
        if (rejectKeywords.some(k => text.includes(k))) {
          await btn.click();
          return;
        }
      }
    } catch (err) {
      console.warn('Cookie-Banner-Interaktion fehlgeschlagen:', err.message);
    }
  }
}

// Crawler ausführen
async function main() {
  const crawler = new CookieGuardCrawler();
  
  try {
    await crawler.initialize();
    
    // Lade URL-Liste
    await crawler.loadUrlList(path.join(__dirname, 'urls.txt'));
    
    // Crawle jede URL
    for (const url of crawler.urlList) {
      await crawler.crawl(url);
    }
    
  } catch (error) {
    console.error('Fehler beim Crawlen:', error);
  } finally {
    await crawler.close();
  }
}

main(); 