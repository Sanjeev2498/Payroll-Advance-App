// Test script to verify frontend login flow
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🚀 Starting frontend login test...');
    
    browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console logs from the page
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (text.includes('🎉') || text.includes('🚨') || text.includes('🔍')) {
        console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }
    });
    
    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    console.log('✅ Login page loaded');
    
    // Fill in credentials
    console.log('📝 Filling in credentials...');
    await page.type('#email', 'admin@demosecurity.co.in');
    await page.type('#password', 'admin123');
    
    console.log('🔐 Credentials filled');
    
    // Submit form and wait for navigation or response
    console.log('🚀 Submitting login form...');
    
    // Wait for either navigation to dashboard or error
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/auth/login') && 
        response.request().method() === 'POST'
      ),
      page.click('button[type="submit"]')
    ]);
    
    console.log('📥 Login API response status:', response.status());
    
    // Wait a bit for any redirects or state changes
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('📍 Current URL after login:', currentUrl);
    
    // Check localStorage for auth data
    const authData = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    
    console.log('💾 Auth localStorage data:', authData ? 'EXISTS' : 'NOT_FOUND');
    
    // Check cookies
    const cookies = await page.cookies();
    const authCookie = cookies.find(cookie => cookie.name === 'auth-token');
    console.log('🍪 Auth cookie:', authCookie ? 'EXISTS' : 'NOT_FOUND');
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ LOGIN SUCCESS! Redirected to dashboard');
    } else if (currentUrl.includes('/auth/login')) {
      console.log('❌ LOGIN FAILED! Still on login page');
    } else {
      console.log('🤔 UNEXPECTED! Redirected to:', currentUrl);
    }
    
    // Keep browser open for 5 seconds to see the result
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();