function normalizeProductName(name) {
    // Clean up string and convert to lowercase
    let normalized = name
        .toLowerCase()
        .replace(/\*\*/g, '')  // Remove asterisks
        .replace(/-/g, ' ')    // Replace hyphens with spaces
        .replace(/[^\w\s.]/g, '')  // Remove other special characters
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim();

    // Standardize measurements
    normalized = normalized
        .replace(/(\d+\.?\d*)\s*(ml|milliliter|millilitre)/gi, '$1ml')
        .replace(/(\d+\.?\d*)\s*(l|ltr|liter|litre)/gi, '$1l')
        .replace(/(\d+\.?\d*)\s*(g|gr|gram|grams)/gi, '$1g')
        .replace(/(\d+\.?\d*)\s*(kg|kilo|kilogram)/gi, '$1kg');

    // Split into words, sort them and rejoin
    const words = normalized.split(' ').filter(word => word.length > 0);
    return words.sort().join(' ');
}

function findMatches(products) {
    const { carrefour = [], tamimi = [], danube = [] } = products;
    const matches = [];
    const unmatched = {
        carrefour: [],
        tamimi: [],
        danube: []
    };

    // Create maps for quick lookup using normalized names
    const normalizedProducts = {
        carrefour: new Map(),
        tamimi: new Map(),
        danube: new Map()
    };

    // Normalize all product names and store in maps
    carrefour.forEach(product => {
        const normalized = normalizeProductName(product.name);
        if (!normalizedProducts.carrefour.has(normalized)) {
            normalizedProducts.carrefour.set(normalized, product);
        }
    });

    tamimi.forEach(product => {
        const normalized = normalizeProductName(product.name);
        if (!normalizedProducts.tamimi.has(normalized)) {
            normalizedProducts.tamimi.set(normalized, product);
        }
    });

    danube.forEach(product => {
        const normalized = normalizeProductName(product.name);
        if (!normalizedProducts.danube.has(normalized)) {
            normalizedProducts.danube.set(normalized, product);
        }
    });

    // Get all unique normalized names
    const allNormalizedNames = new Set([
        ...normalizedProducts.carrefour.keys(),
        ...normalizedProducts.tamimi.keys(),
        ...normalizedProducts.danube.keys()
    ]);

    // Find matches across stores
    allNormalizedNames.forEach(normalizedName => {
        const carrefourProduct = normalizedProducts.carrefour.get(normalizedName);
        const tamimiProduct = normalizedProducts.tamimi.get(normalizedName);
        const danubeProduct = normalizedProducts.danube.get(normalizedName);

        if ((carrefourProduct && tamimiProduct) || 
            (carrefourProduct && danubeProduct) || 
            (tamimiProduct && danubeProduct)) {
            matches.push({
                normalizedName,
                originalNames: {
                    carrefour: carrefourProduct?.name,
                    tamimi: tamimiProduct?.name,
                    danube: danubeProduct?.name,
                },
                stores: {
                    carrefour: carrefourProduct ? {
                        name: carrefourProduct.name,
                        price: carrefourProduct.price,
                        link: carrefourProduct.productLink,
                        imageLink: carrefourProduct.productImageLink
                    } : null,
                    tamimi: tamimiProduct ? {
                        name: tamimiProduct.name,
                        price: tamimiProduct.price,
                        link: tamimiProduct.productLink,
                        imageLink: tamimiProduct.productImageLink
                    } : null,
                    danube: danubeProduct ? {
                        name: danubeProduct.name,
                        price: danubeProduct.price,
                        link: danubeProduct.productLink,
                        imageLink: danubeProduct.productImageLink
                    } : null
                }
            });
        } else {
            // Add to unmatched
            if (carrefourProduct) unmatched.carrefour.push(carrefourProduct);
            if (tamimiProduct) unmatched.tamimi.push(tamimiProduct);
            if (danubeProduct) unmatched.danube.push(danubeProduct);
        }
    });

    // Add debug info for first few unmatched products
    const debugSample = 5;
    const debugInfo = {
        unmatchedSamples: {
            tamimi: unmatched.tamimi.slice(0, debugSample).map(p => ({
                original: p.name,
                normalized: normalizeProductName(p.name)
            })),
            danube: unmatched.danube.slice(0, debugSample).map(p => ({
                original: p.name,
                normalized: normalizeProductName(p.name)
            }))
        }
    };

    return {
        matches,
        unmatched,
        debugInfo,
        stats: {
            totalProducts: carrefour.length + tamimi.length + danube.length,
            matchedProducts: matches.length,
            unmatchedProducts: {
                carrefour: unmatched.carrefour.length,
                tamimi: unmatched.tamimi.length,
                danube: unmatched.danube.length,
                total: unmatched.carrefour.length + unmatched.tamimi.length + unmatched.danube.length
            }
        }
    };
}

module.exports = { findMatches, normalizeProductName };