const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const { scrapeCarrefourCategory, scrapeTamimiCategory, scrapeDanubeCategory } = require('./scraper');
const { findMatches } = require('./productMatcher');
const { startPeriodicUpdates } = require('./firebase');

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


async function testMode() {
    try {
        const choice = await selectTestMode();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        switch(choice) {
            case '1':
                console.log('\nRunning Comparison Mode - Scraping all stores...');
                
                console.log('\nScraping Carrefour...');
                const carrefourProducts = await scrapeCarrefourCategory(config.CATEGORY_URLS.DAIRY.carrefour);
                
                console.log('\nScraping Tamimi...');
                const tamimiProducts = await scrapeTamimiCategory(config.CATEGORY_URLS.DAIRY.tamimi);
                
                console.log('\nScraping Danube...');
                const danubeProducts = await scrapeDanubeCategory(config.CATEGORY_URLS.DAIRY.danube);

                const results = findMatches({
                    carrefour: carrefourProducts,
                    tamimi: tamimiProducts,
                    danube: danubeProducts
                });

                const compareFilename = `comparison_results_${timestamp}.json`;
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
                console.log('\nScraping Carrefour...');
                const carrefourResults = await scrapeCarrefourCategory(config.CATEGORY_URLS.DAIRY.carrefour);
                const carrefourFilename = `carrefour_results_${timestamp}.json`;
                
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', carrefourFilename),
                    JSON.stringify(carrefourResults, null, 2)
                );
                
                console.log(`\nResults saved to scraped_data/${carrefourFilename}`);
                console.log(`Total products scraped: ${carrefourResults.length}`);
                break;

            case '3':
                console.log('\nScraping Tamimi...');
                const tamimiResults = await scrapeTamimiCategory(config.CATEGORY_URLS.DAIRY.tamimi);
                const tamimiFilename = `tamimi_results_${timestamp}.json`;
                
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', tamimiFilename),
                    JSON.stringify(tamimiResults, null, 2)
                );
                
                console.log(`\nResults saved to scraped_data/${tamimiFilename}`);
                console.log(`Total products scraped: ${tamimiResults.length}`);
                break;

            case '4':
                console.log('\nScraping Danube...');
                const danubeResults = await scrapeDanubeCategory(config.CATEGORY_URLS.DAIRY.danube);
                const danubeFilename = `danube_results_${timestamp}.json`;
                
                await fs.writeFile(
                    path.join(process.cwd(), 'scraped_data', danubeFilename),
                    JSON.stringify(danubeResults, null, 2)
                );
                
                console.log(`\nResults saved to scraped_data/${danubeFilename}`);
                console.log(`Total products scraped: ${danubeResults.length}`);
                break;

            case '5':
                return;

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
        console.log('\nStarting Live Mode with periodic updates...');
        await startPeriodicUpdates();
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