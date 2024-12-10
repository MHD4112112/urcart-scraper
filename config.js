module.exports = {
    SCRAPE_INTERVAL: 12 * 60 * 60 * 1000,
    CATEGORY_URLS: {
        DAIRY: {
            carrefour: 'https://www.carrefourksa.com/mafsau/en/c/FKSA1630000',
            tamimi: 'https://shop.tamimimarkets.com/category/dairy',
            danube: 'https://www.danube.sa/en/departments/dairy-eggs'
        }
    },
    MAX_RETRIES: 3,
    BROWSER_CONFIG: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080' 
        ]
    },
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};