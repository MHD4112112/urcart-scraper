const admin = require('firebase-admin');
const { scrapeCarrefourCategory, scrapeTamimiCategory, scrapeDanubeCategory } = require('./scraper');
const { findMatches } = require('./productMatcher');
const config = require('./config');

const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function storeMatchedProducts() {
    try {
        console.log('Starting product scraping...');
        
        const carrefourProducts = await scrapeCarrefourCategory(config.CATEGORY_URLS.DAIRY.carrefour);
        const tamimiProducts = await scrapeTamimiCategory(config.CATEGORY_URLS.DAIRY.tamimi);
        const danubeProducts = await scrapeDanubeCategory(config.CATEGORY_URLS.DAIRY.danube);

        const results = findMatches({
            carrefour: carrefourProducts,
            tamimi: tamimiProducts,
            danube: danubeProducts
        });

        // Filter for products that exist in all three stores
        const tripleMatches = results.matches.filter(product => 
            product.stores.carrefour && 
            product.stores.tamimi && 
            product.stores.danube
        );

        const batch = db.batch();
        const productsRef = db.collection('Products2.0');

        for (const product of tripleMatches) {
            const docId = product.originalNames.carrefour
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');

            const productData = {
                name: product.originalNames.carrefour,
                category: 'Dairy',
                isMeasurable: false,
                description: '',
                stores: {
                    carrefour: {
                        price: product.stores.carrefour.price,
                        productLink: product.stores.carrefour.link || '',
                        productImageLink: product.stores.carrefour.imageLink || ''
                    },
                    tamimi: {
                        price: product.stores.tamimi.price,
                        productLink: product.stores.tamimi.link || '',
                        productImageLink: product.stores.tamimi.imageLink || ''
                    },
                    danube: {
                        price: product.stores.danube.price,
                        productLink: product.stores.danube.link || '',
                        productImageLink: product.stores.danube.imageLink || ''
                    }
                },
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            const docRef = productsRef.doc(docId);
            batch.set(docRef, productData, { merge: true });
        }

        await batch.commit();
        console.log(`Stored ${tripleMatches.length} matched products in Firestore`);
        return tripleMatches.length;
    } catch (error) {
        console.error('Error storing products:', error);
        throw error;
    }
}

// Function to run periodic updates
function startPeriodicUpdates() {
    console.log('Starting periodic updates...');
    
    // Run immediately on start
    storeMatchedProducts()
        .then(count => console.log(`Initial update completed: ${count} products stored`))
        .catch(console.error);

    // Then run every SCRAPE_INTERVAL
    setInterval(async () => {
        try {
            const count = await storeMatchedProducts();
            console.log(`Periodic update completed: ${count} products stored`);
        } catch (error) {
            console.error('Error in periodic update:', error);
        }
    }, config.SCRAPE_INTERVAL);
}

module.exports = { storeMatchedProducts, startPeriodicUpdates };