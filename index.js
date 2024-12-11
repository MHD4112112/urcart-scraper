const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const { scrapeCarrefourCategory, scrapeTamimiCategory, scrapeDanubeCategory } = require('./scraper');
const { findMatches } = require('./productMatcher');
const { startPeriodicUpdates, scrapeAndStoreCategory } = require('./firebase');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


async function selectTestMode() {
    console.log(`
Select test mode:
1. Compare All Stores
2. Scrape Carrefour
3. Scrape Tamimi
4. Scrape Danube
5. Back to Main Menu
`);

    return new Promise((resolve) => {
        rl.question('Please select a store: ', (choice) => {
            resolve(choice);
        });
    });
}
async function selectCategory() {
    console.log('\nSelect category:');
    const categories = Object.keys(config.CATEGORY_URLS);
    categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category}`);
    });
    console.log(`${categories.length + 1}. Back`);

    const choice = await new Promise(resolve => {
        rl.question('Choose category: ', resolve);
    });

    const categoryIndex = parseInt(choice) - 1;
    return categoryIndex < categories.length ? categories[categoryIndex] : null;
}

async function selectLiveMode() {
    console.log(`
Select mode:
1. Scrape All Categories
2. Scrape Specific Category
3. Back to Main Menu
`);
    return new Promise(resolve => {
        rl.question('Select option: ', resolve);
    });
}

async function testMode() {
    try {
        const choice = await selectTestMode();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        if (choice === '5') return;

        const category = await selectCategory();
        if (!category) return;

        switch(choice) {
            case '1':
                console.log(`\nRunning Comparison Mode - Scraping all stores for ${category}...`);
                
                console.log('\nScraping Carrefour...');
                const carrefourProducts = await scrapeCarrefourCategory(config.CATEGORY_URLS[category].carrefour);
                
                console.log('\nScraping Tamimi...');
                const tamimiProducts = await scrapeTamimiCategory(config.CATEGORY_URLS[category].tamimi);
                
                console.log('\nScraping Danube...');
                const danubeProducts = await scrapeDanubeCategory(config.CATEGORY_URLS[category].danube);

                const results = findMatches({
                    carrefour: carrefourProducts,
                    tamimi: tamimiProducts,
                    danube: danubeProducts
                });

                const compareFilename = `${category}_comparison_results_${timestamp}.json`;
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', compareFilename),
                    JSON.stringify(results, null, 2)
                );
                
                console.log('\nScraping Results:');
                console.log('================');
                console.log(`Total products found: ${results.stats.totalProducts}`);
                console.log(`Matched products: ${results.stats.matchedProducts}`);
                console.log('\nUnmatched products by store:');
                console.log(`Carrefour: ${results.stats.unmatchedProducts.carrefour}`);
                console.log(`Tamimi: ${results.stats.unmatchedProducts.tamimi}`);
                console.log(`Danube: ${results.stats.unmatchedProducts.danube}`);
                console.log(`\nResults saved to scraped_data/${compareFilename}`);
                break;

            case '2':
                console.log(`\nScraping Carrefour ${category}...`);
                const carrefourResults = await scrapeCarrefourCategory(config.CATEGORY_URLS[category].carrefour);
                const carrefourFilename = `${category}_carrefour_results_${timestamp}.json`;
                
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', carrefourFilename),
                    JSON.stringify(carrefourResults, null, 2)
                );
                
                console.log(`\nResults saved to scraped_data/${carrefourFilename}`);
                console.log(`Total products scraped: ${carrefourResults.length}`);
                break;

            case '3':
                console.log(`\nScraping Tamimi ${category}...`);
                const tamimiResults = await scrapeTamimiCategory(config.CATEGORY_URLS[category].tamimi);
                const tamimiFilename = `${category}_tamimi_results_${timestamp}.json`;
                
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', tamimiFilename),
                    JSON.stringify(tamimiResults, null, 2)
                );
                
                console.log(`\nResults saved to scraped_data/${tamimiFilename}`);
                console.log(`Total products scraped: ${tamimiResults.length}`);
                break;

            case '4':
                console.log(`\nScraping Danube ${category}...`);
                const danubeResults = await scrapeDanubeCategory(config.CATEGORY_URLS[category].danube);
                const danubeFilename = `${category}_danube_results_${timestamp}.json`;
                
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', danubeFilename),
                    JSON.stringify(danubeResults, null, 2)
                );
                
                console.log(`\nResults saved to scraped_data/${danubeFilename}`);
                console.log(`Total products scraped: ${danubeResults.length}`);
                break;

            default:
                console.log('\nInvalid choice. Please try again.');
                break;
        }
    } catch (error) {
        console.error('Error in Test Mode:', error);
    }
}
async function liveMode() {
    try {
        const choice = await selectLiveMode();
        
        switch(choice) {
            case '1':
                console.log('\nStarting periodic updates for all categories...');
                await startPeriodicUpdates();
                break;
            case '2':
                const category = await selectCategory();
                if (category) {
                    console.log(`\nScraping ${category}...`);
                    await scrapeAndStoreCategory(config.CATEGORY_URLS[category], category);
                }
                promptContinue();
                break;
            case '3':
                startApp();
                break;
            default:
                console.log('\nInvalid choice');
                promptContinue();
        }
    } catch (error) {
        console.error('Error in Live Mode:', error);
        promptContinue();
    }
}
function displayMenu() {
    console.clear();
    console.log(`
╔════════════════════════════╗
║      UrCart Scraper       ║
╚════════════════════════════╝

1. Test Mode (Create JSON file)
2. Live Mode (Update Firestore)
3. Exit

`);
}

async function handleChoice(choice) {
    switch (choice) {
        case '1':
            await testMode();
            promptContinue();
            break;
        case '2':
            await liveMode();
            break;
        case '3':
            console.log('\nExiting UrCart Scraper...');
            rl.close();
            break;
        default:
            console.log('\nInvalid choice. Please try again.');
            promptContinue();
    }
}

function promptContinue() {
    rl.question('\nPress Enter to return to menu...', () => {
        startApp();
    });
}

function startApp() {
    displayMenu();
    rl.question('Please select a mode: ', async (choice) => {
        await handleChoice(choice);
    });
}

console.log('Starting UrCart Scraper...');
setTimeout(startApp, 1000);