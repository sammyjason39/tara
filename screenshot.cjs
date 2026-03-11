const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/auth/login');
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@zenvix.com');
  await page.type('input[type="password"]', 'admin123');
  
  await page.click('button[type="submit"]');
  
  // Wait to see what happens
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: 'debug-login.png' });
  console.log("Screenshot saved to debug-login.png");
  
  await browser.close();
})();
