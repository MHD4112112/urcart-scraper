module.exports = {
    SCRAPE_INTERVAL: 12 * 60 * 60 * 1000,
    CATEGORY_URLS: {
        Dairy: {
            carrefour: 'https://www.carrefourksa.com/mafsau/en/c/FKSA1630000',
            tamimi: 'https://shop.tamimimarkets.com/category/dairy',
            danube: 'https://www.danube.sa/en/departments/dairy-eggs'
        },    Bakery: {
            carrefour: 'https://www.carrefourksa.com/mafsau/en/c/FKSA1610000',
            tamimi: 'https://shop.tamimimarkets.com/category/food--beverages',
            danube: 'https://www.danube.sa/en/departments/bakery-2'
        },Coffee: {
            carrefour: 'https://www.carrefourksa.com/mafsau/en/c/FKSA1510000',
            tamimi: 'https://shop.tamimimarkets.com/en/category/hot-drinks--creamers',
            danube: 'https://www.danube.sa/en/departments/tea-coffee/coffee'
        },HairCare: {
            carrefour: 'https://www.carrefourksa.com/mafsau/en/c/NFKSA2000000?currentPage=0&filter=product_category_level_2_en%3A%27NFKSA2030000%27&nextPageOffset=0&pageSize=60&sortBy=relevance',
            tamimi: 'https://shop.tamimimarkets.com/en/category/hair-care',
            danube: 'https://danube.sa/en/departments/personal-care-2?hierarchicalMenu%5Btaxons_en.lvl0%5D%5B0%5D=Departments&hierarchicalMenu%5Btaxons_en.lvl0%5D%5B1%5D=Personal%20Care&hierarchicalMenu%5Btaxons_en.lvl0%5D%5B2%5D=Hair%20Care'
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