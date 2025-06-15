const puppeteer = require('puppeteer');

async function runTest() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#root', { visible: true });

    const audioPlayerExists = await page.evaluate(() => {
      const rootElement = document.getElementById('root');
      return rootElement ? !!rootElement.querySelector('.audio-player') : false;
    });

    if (audioPlayerExists) {
      console.log("PASS");
    } else {
      console.log("FAIL");
    }
  } catch (error) {
    console.log("FAIL");
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runTest();
