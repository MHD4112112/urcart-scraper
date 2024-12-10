const puppeteer = require('puppeteer');
const config = require('./config');

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function loadAllProducts(page) {
    try {
        let previousProductCount = 0;
        let currentProductCount = 0;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            // Scroll down
            console.log('Scrolling page...');
            await autoScroll(page);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Try to find and click "Load More" button
            const loadMoreButton = await page.$('[data-testid="trolly-button"]');
            if (loadMoreButton) {
                const buttonText = await page.evaluate(button => button.textContent, loadMoreButton);
                if (buttonText.includes('Load More')) {
                    console.log('Found Load More button, clicking...');
                    await loadMoreButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            currentProductCount = await page.evaluate(() => 
                document.querySelectorAll('[data-testid="product_name"]').length
            );

            console.log(`Current product count: ${currentProductCount}`);

            if (currentProductCount === previousProductCount) {
                attempts++;
                console.log(`No new products loaded. Attempt ${attempts}/${maxAttempts}`);
            } else {
                attempts = 0;
                previousProductCount = currentProductCount;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`Finished loading products. Total found: ${currentProductCount}`);
    } catch (error) {
        console.log('Error while loading products:', error);
    }
}
async function scrapeTamimiCategory(url, retryCount = 0) {
    console.log('\nStarting browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: config.BROWSER_CONFIG.args
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(config.USER_AGENT);
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navigating to Tamimi category...');
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        await page.waitForSelector('[data-testid="product"]', { 
            timeout: 30000 
        });

        await loadAllProducts(page);

        console.log('Extracting product information...');

        const products = await page.evaluate(() => {
            const productContainers = document.querySelectorAll('[data-testid="product"]');
            const scrapedAt = new Date().toISOString();
            
            return Array.from(productContainers).flatMap(container => {
                const productLink = container.closest('a').href;
                const brand = container.querySelector('.Text-sc-1bsd7ul-0.jwWsjf')?.textContent.trim().replace(/\s+$/, '') || '';
                const productName = container.querySelector('.Product__StyledNameText-sc-13egllk-16')?.textContent.trim() || '';
                const productImageLink = container.querySelector('.Product__StyledImage-sc-13egllk-4')?.src || '';

                // Helper function to construct full name
                const constructFullName = (name, variantSize) => {
                    // Get everything before the last hyphen and add the new variant
                    const baseName = `${brand} ${name}`.split('-')[0];
                    return variantSize ? `${baseName}-${variantSize}` : `${brand} ${name}`;
                };

                const variantsContainer = container.querySelector('.Product__StyledVariant-sc-13egllk-2');
                
                if (variantsContainer) {
                    const variants = Array.from(variantsContainer.querySelectorAll('.Product__VariantDetails-sc-13egllk-12')).map(variant => {
                        const priceText = variant.querySelector('.Product__VariantPrice-sc-13egllk-14 .Text-sc-1bsd7ul-0')?.textContent.trim() || '';
                        const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                        const sizeText = variant.querySelector('.Product__VariantName-sc-13egllk-15')?.textContent.trim() || '';
                        const size = sizeText.replace('/', '').trim();
                        
                        return {
                            productLink,
                            brand,
                            productImageLink,
                            scrapedAt,
                            name: constructFullName(productName, size),
                            price
                        };
                    });
                    return variants;
                } else {
                    const priceText = container.querySelector('.Product__PriceAndSaveButton-sc-13egllk-8 .Text-sc-1bsd7ul-0.bWrtIK span')?.textContent.trim() || '';
                    const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                    
                    return [{
                        productLink,
                        brand,
                        productImageLink,
                        scrapedAt,
                        name: constructFullName(productName),
                        price
                    }];
                }
            }).filter(product => product.price && product.name);
        });

        console.log(`Successfully scraped ${products.length} products`);
        
        if (products.length > 0) {
            console.log('\nFirst and last products:');
            console.log('First:', JSON.stringify(products[0], null, 2));
            console.log('Last:', JSON.stringify(products[products.length - 1], null, 2));
        }
        
        return products;

    } catch (error) {
        console.error(`Error during scraping (attempt ${retryCount + 1}/${config.MAX_RETRIES}):`, error.message);
        
        await browser.close();
        
        if (retryCount < config.MAX_RETRIES - 1) {
            console.log(`Retrying in 5 seconds... (attempt ${retryCount + 2}/${config.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return scrapeTamimiCategory(url, retryCount + 1);
        }
        
        throw error;
    } finally {
        await browser.close();
    }
}
async function scrapeCarrefourCategory(url, retryCount = 0) {
    console.log('\nStarting browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: config.BROWSER_CONFIG.args
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(config.USER_AGENT);
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navigating to Carrefour Dairy category...');
        
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        // Wait for products to load
        await page.waitForSelector('[data-testid="product_name"]', { 
            timeout: 30000 
        });

        await loadAllProducts(page);

        console.log('Extracting product information...');

        const products = await page.evaluate(() => {
            const productContainers = document.querySelectorAll('.css-b9nx4o');
            
            return Array.from(productContainers).map(container => {
                const nameElement = container.querySelector('[data-testid="product_name"]');
                const name = nameElement ? nameElement.textContent.trim() : '';
                const productLink = nameElement ? nameElement.href : '';
                
                const wholePriceElement = container.querySelector('.css-14zpref');
                const decimalPriceElement = container.querySelector('.css-1pjcwg4');
                
                let price = null;
                if (wholePriceElement) {
                    const wholeNumber = wholePriceElement.textContent.trim();
                    const decimal = decimalPriceElement ? decimalPriceElement.textContent.trim() : '00';
                    price = parseFloat(`${wholeNumber}${decimal}`);
                }
        
                // Updated image extraction to ensure we get the proper URL
                const imageElement = container.querySelector('[data-testid="product_image_main"]');
                let productImageLink = '';
                if (imageElement && imageElement.src && !imageElement.src.startsWith('data:')) {
                    productImageLink = imageElement.src;
                }
                
                if (name || price) {
                    return {
                        name,
                        price,
                        productLink,
                        productImageLink
                    };
                }
                return null;
            }).filter(product => product !== null);
        });

        console.log(`Successfully scraped ${products.length} dairy products`);
        
        if (products.length > 0) {
            console.log('\nFirst and last products:');
            console.log('First:', JSON.stringify(products[0], null, 2));
            console.log('Last:', JSON.stringify(products[products.length - 1], null, 2));
        }
        
        return products;

    } catch (error) {
        console.error(`Error during scraping (attempt ${retryCount + 1}/${config.MAX_RETRIES}):`, error.message);
        
        await browser.close();
        
        if (retryCount < config.MAX_RETRIES - 1) {
            console.log(`Retrying in 5 seconds... (attempt ${retryCount + 2}/${config.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return scrapeCarrefourCategory(url, retryCount + 1);
        }
        
        throw error;
    } finally {
        await browser.close();
    }
}


async function scrapeDanubeCategory(url, retryCount = 0) {
    console.log('\nStarting browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: config.BROWSER_CONFIG.args
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(config.USER_AGENT);
        
        console.log('Navigating to Danube...');
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for and click the store selector button
        console.log('Waiting for store selector...');
        await page.waitForSelector('.d-store-selector__apply-btn');
        await page.screenshot({ 
            path: 'scraped_data/danube_before_store_select.png',
            fullPage: true 
        });

        console.log('Clicking store select button...');
        await page.click('.d-store-selector__apply-btn');
        
        // Wait for page to load after store selection
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // Now wait for products
        await page.waitForSelector('.ais-hits--item');

        let allProducts = [];
        let hasNextPage = true;
        let currentPage = 1;

        while (hasNextPage) {
            console.log(`Scraping page ${currentPage}...`);

            // Get all products on current page
            const products = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.ais-hits--item')).map(item => {
                    const name = item.querySelector('.product-box__name')?.textContent.trim();
                    const priceText = item.querySelector('.product-price__current-price')?.textContent.trim();
                    const price = priceText ? parseFloat(priceText.replace('SAR', '').trim()) : null;
                    const link = item.querySelector('.product-box a')?.href;
                    
                    const imageElement = item.querySelector('.product-box__image__element');
                    const style = window.getComputedStyle(imageElement);
                    const urlMatch = style.backgroundImage.match(/url\("(.+?)"\)/);
                    const imageUrl = urlMatch ? urlMatch[1] : '';

                    return {
                        name,
                        price,
                        productLink: link,
                        productImageLink: imageUrl
                    };
                });
            });

            allProducts = allProducts.concat(products);
            console.log(`Found ${products.length} products on page ${currentPage}`);

            // Check if there's a next page
            const isLastPage = await page.evaluate(() => {
                const nextButton = document.querySelector('.ais-pagination--item__next');
                return nextButton && nextButton.classList.contains('ais-pagination--item__disabled');
            });

            if (isLastPage) {
                console.log('Reached last page');
                hasNextPage = false;
            } else {
                // Click next page and wait for products to load
                await Promise.all([
                    page.click('.ais-pagination--item__next a'),
                    page.waitForNavigation({ waitUntil: 'networkidle0' })
                ]);
                currentPage++;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        console.log(`Successfully scraped ${allProducts.length} products from Danube`);
        
        if (allProducts.length > 0) {
            console.log('\nFirst and last products:');
            console.log('First:', JSON.stringify(allProducts[0], null, 2));
            console.log('Last:', JSON.stringify(allProducts[allProducts.length - 1], null, 2));
        }
        
        return allProducts;

    } catch (error) {
        console.error(`Error during scraping (attempt ${retryCount + 1}/${config.MAX_RETRIES}):`, error.message);
        
        await browser.close();
        
        if (retryCount < config.MAX_RETRIES - 1) {
            console.log(`Retrying in 5 seconds... (attempt ${retryCount + 2}/${config.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return scrapeDanubeCategory(url, retryCount + 1);
        }
        
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = {
    scrapeCarrefourCategory,
    scrapeTamimiCategory,
    scrapeDanubeCategory
};