const admin = require('firebase-admin');
const { scrapeCarrefourCategory, scrapeTamimiCategory, scrapeDanubeCategory } = require('./scraper');
const { findMatches } = require('./productMatcher');
const config = require('./config');

const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function scrapeAndStoreCategory(categoryUrls, categoryName) {
    try {
        console.log(`Scraping ${categoryName}...`);
        const carrefourProducts = await scrapeCarrefourCategory(categoryUrls.carrefour);
        const tamimiProducts = await scrapeTamimiCategory(categoryUrls.tamimi);
        const danubeProducts = await scrapeDanubeCategory(categoryUrls.danube);

        const results = findMatches({
            carrefour: carrefourProducts,
            tamimi: tamimiProducts,
            danube: danubeProducts
        });

        // Combine full and partial matches
        const allMatches = [...results.fullMatches, ...results.partialMatches];

        const batch = db.batch();
        const productsRef = db.collection('Products2.0');

        let storedCount = 0;

        for (const product of allMatches) {
            const docId = product.originalNames.carrefour || 
                         product.originalNames.tamimi || 
                         product.originalNames.danube;

            if (docId) {
                const cleanDocId = docId
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');

                const productData = {
                    name: docId,
                    category: categoryName,
                    isMeasurable: false,
                    description: '',
                    matchType: results.fullMatches.includes(product) ? 'full' : 'partial',
                    stores: {
                        carrefour: product.stores.carrefour ? {
                            price: product.stores.carrefour.price,
                            productLink: product.stores.carrefour.link || '',
                            productImageLink: product.stores.carrefour.imageLink || ''
                        } : null,
                        tamimi: product.stores.tamimi ? {
                            price: product.stores.tamimi.price,
                            productLink: product.stores.tamimi.link || '',
                            productImageLink: product.stores.tamimi.imageLink || ''
                        } : null,
                        danube: product.stores.danube ? {
                            price: product.stores.danube.price,
                            productLink: product.stores.danube.link || '',
                            productImageLink: product.stores.danube.imageLink || ''
                        } : null
                    },
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                };

                const docRef = productsRef.doc(cleanDocId);
                batch.set(docRef, productData, { merge: true });
                storedCount++;
            }
        }

        await batch.commit();
        console.log(`Successfully stored ${storedCount} products in Firestore`);
        console.log(`Full matches: ${results.stats.fullMatchProducts}`);
        console.log(`Partial matches: ${results.stats.partialMatchProducts}`);
        
        return storedCount;
    } catch (error) {
        console.error('Error storing products:', error);
        throw error;
    }
}

async function storeMatchedProducts() {
    try {
        console.log('Starting product scraping for all categories...');
        let totalProducts = 0;

        for (const [categoryName, urls] of Object.entries(config.CATEGORY_URLS)) {
            console.log(`Processing ${categoryName}...`);
            const count = await scrapeAndStoreCategory(urls, categoryName);
            totalProducts += count;
        }

        return totalProducts;
    } catch (error) {
        console.error('Error storing products:', error);
        throw error;
    }
}

function startPeriodicUpdates() {
    console.log('Starting periodic updates...');
    
    storeMatchedProducts()
        .then(count => console.log(`Initial update completed: ${count} total products stored`))
        .catch(console.error);

    setInterval(async () => {
        try {
            const count = await storeMatchedProducts();
            console.log(`Periodic update completed: ${count} total products stored`);
        } catch (error) {
            console.error('Error in periodic update:', error);
        }
    }, config.SCRAPE_INTERVAL);
}

module.exports = { storeMatchedProducts, startPeriodicUpdates, scrapeAndStoreCategory };