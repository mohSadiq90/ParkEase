/**
 * Location Auto-Complete & Geocoding Service
 * Integrates address search, Google Places API, and smart fuzzy standardization
 * to resolve spelling, typo, and capitalization variations (e.g. 'katraj' vs. 'Kartaj').
 */

import environment from '../../config/environment';
import logger from '../../utils/logger';

const TAG = 'LocationAutocompleteService';

// Built-in dictionary of well-known localities and Indian city hubs with common typos/aliases
const STANDARDIZED_PLACES = [
    {
        id: 'place_katraj',
        aliases: ['katraj', 'kartaj', 'katraj dairy', 'katraj ghat', 'katraj chowk', 'katraj pune'],
        primaryText: 'Katraj',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Katraj, Pune, Maharashtra 411046, India',
        street: 'Katraj',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411046',
        country: 'India',
        latitude: 18.4575,
        longitude: 73.8677,
    },
    {
        id: 'place_kothrud',
        aliases: ['kothrud', 'kotrud', 'kothrud pune', 'paud road', 'karve nagar'],
        primaryText: 'Kothrud',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Kothrud, Pune, Maharashtra 411038, India',
        street: 'Kothrud',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411038',
        country: 'India',
        latitude: 18.5074,
        longitude: 73.8077,
    },
    {
        id: 'place_baner',
        aliases: ['baner', 'banner', 'baner road', 'baner pune'],
        primaryText: 'Baner',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Baner, Pune, Maharashtra 411045, India',
        street: 'Baner',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411045',
        country: 'India',
        latitude: 18.5590,
        longitude: 73.7868,
    },
    {
        id: 'place_hinjewadi',
        aliases: ['hinjewadi', 'hinjwadi', 'hinjewadi phase 1', 'hinjawadi', 'hinjewadi it park'],
        primaryText: 'Hinjewadi',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Hinjewadi, Pune, Maharashtra 411057, India',
        street: 'Hinjewadi',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411057',
        country: 'India',
        latitude: 18.5913,
        longitude: 73.7389,
    },
    {
        id: 'place_viman_nagar',
        aliases: ['viman nagar', 'vimannagar', 'viman nagar pune', 'phoenix mall viman nagar'],
        primaryText: 'Viman Nagar',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Viman Nagar, Pune, Maharashtra 411014, India',
        street: 'Viman Nagar',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411014',
        country: 'India',
        latitude: 18.5679,
        longitude: 73.9143,
    },
    {
        id: 'place_koregaon_park',
        aliases: ['koregaon park', 'koregoan', 'koregaon', 'kp pune'],
        primaryText: 'Koregaon Park',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Koregaon Park, Pune, Maharashtra 411001, India',
        street: 'Koregaon Park',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
        latitude: 18.5362,
        longitude: 73.8940,
    },
    {
        id: 'place_wakad',
        aliases: ['wakad', 'wakkad', 'wakad pune', 'dange chowk'],
        primaryText: 'Wakad',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Wakad, Pune, Maharashtra 411057, India',
        street: 'Wakad',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411057',
        country: 'India',
        latitude: 18.5987,
        longitude: 73.7686,
    },
    {
        id: 'place_hadapsar',
        aliases: ['hadapsar', 'hadpsar', 'magarpatta', 'hadapsar pune'],
        primaryText: 'Hadapsar',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Hadapsar, Pune, Maharashtra 411028, India',
        street: 'Hadapsar',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411028',
        country: 'India',
        latitude: 18.5089,
        longitude: 73.9259,
    },
    {
        id: 'place_shivaji_nagar',
        aliases: ['shivaji nagar', 'shivajinagar', 'shivaji nagar pune'],
        primaryText: 'Shivaji Nagar',
        secondaryText: 'Pune, Maharashtra, India',
        fullAddress: 'Shivaji Nagar, Pune, Maharashtra 411005, India',
        street: 'Shivaji Nagar',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411005',
        country: 'India',
        latitude: 18.5314,
        longitude: 73.8446,
    },
    {
        id: 'place_bandra',
        aliases: ['bandra', 'bandra west', 'bandra east', 'bandra mumbai'],
        primaryText: 'Bandra',
        secondaryText: 'Mumbai, Maharashtra, India',
        fullAddress: 'Bandra, Mumbai, Maharashtra 400050, India',
        street: 'Bandra',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        country: 'India',
        latitude: 19.0596,
        longitude: 72.8295,
    },
    {
        id: 'place_andheri',
        aliases: ['andheri', 'andheri west', 'andheri east', 'andheri mumbai'],
        primaryText: 'Andheri',
        secondaryText: 'Mumbai, Maharashtra, India',
        fullAddress: 'Andheri, Mumbai, Maharashtra 400053, India',
        street: 'Andheri',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053',
        country: 'India',
        latitude: 19.1136,
        longitude: 72.8697,
    },
    {
        id: 'place_koramangala',
        aliases: ['koramangala', 'kormangala', 'koramangala bangalore'],
        primaryText: 'Koramangala',
        secondaryText: 'Bengaluru, Karnataka, India',
        fullAddress: 'Koramangala, Bengaluru, Karnataka 560034, India',
        street: 'Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560034',
        country: 'India',
        latitude: 12.9352,
        longitude: 77.6245,
    },
    {
        id: 'place_indiranagar',
        aliases: ['indiranagar', 'indira nagar', 'indiranagar bangalore'],
        primaryText: 'Indiranagar',
        secondaryText: 'Bengaluru, Karnataka, India',
        fullAddress: 'Indiranagar, Bengaluru, Karnataka 560038, India',
        street: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'India',
        latitude: 12.9784,
        longitude: 77.6408,
    },
    {
        id: 'place_connaught_place',
        aliases: ['connaught place', 'cp delhi', 'cp new delhi'],
        primaryText: 'Connaught Place',
        secondaryText: 'New Delhi, Delhi, India',
        fullAddress: 'Connaught Place, New Delhi, Delhi 110001, India',
        street: 'Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
        latitude: 28.6315,
        longitude: 77.2167,
    },
];

/**
 * Standardize capitalization of strings (Title Case)
 */
export const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
        .join(' ');
};

/**
 * Location Autocomplete Service
 */
export const locationAutocompleteService = {
    /**
     * Search places by query with typo tolerance and standardization
     * @param {string} query Search input
     * @returns {Promise<Array>} List of standardized place predictions
     */
    async searchPlaces(query) {
        if (!query || typeof query !== 'string') return [];
        const cleanQuery = query.trim().toLowerCase();
        if (cleanQuery.length < 2) return [];

        // 1. Search local standardized dictionary (handles spelling variations like "katraj" vs. "Kartaj")
        const matchedLocal = STANDARDIZED_PLACES.filter((place) => {
            if (place.primaryText.toLowerCase().includes(cleanQuery)) return true;
            if (place.city.toLowerCase().includes(cleanQuery)) return true;
            return place.aliases.some((alias) => alias.includes(cleanQuery) || cleanQuery.includes(alias));
        });

        // 2. If Google Places API key is configured, query Google Places Autocomplete
        const googleKey = environment.googlePlacesApiKey;
        if (googleKey && typeof googleKey === 'string' && googleKey.trim() !== '') {
            try {
                const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                    cleanQuery
                )}&key=${googleKey}&types=geocode`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.status === 'OK' && Array.isArray(data.predictions)) {
                    const googleResults = data.predictions.map((p) => ({
                        id: p.place_id,
                        primaryText: p.structured_formatting?.main_text || p.description,
                        secondaryText: p.structured_formatting?.secondary_text || '',
                        fullAddress: p.description,
                        street: p.structured_formatting?.main_text || '',
                        city: '',
                        state: '',
                        postalCode: '',
                        country: 'India',
                        isGooglePlace: true,
                    }));
                    // Return merged results with local prioritized
                    const combined = [...matchedLocal];
                    googleResults.forEach((g) => {
                        if (!combined.some((c) => c.primaryText.toLowerCase() === g.primaryText.toLowerCase())) {
                            combined.push(g);
                        }
                    });
                    return combined;
                }
            } catch (err) {
                logger.warn(TAG, 'Google Places API call failed, falling back to local matches', err);
            }
        }

        // 3. Fallback: If no local match and no Google Places, synthesize a standardized title-cased suggestion
        if (matchedLocal.length === 0 && cleanQuery.length >= 3) {
            const formatted = toTitleCase(cleanQuery);
            return [
                {
                    id: `synthesized_${cleanQuery}`,
                    primaryText: formatted,
                    secondaryText: 'Standardized Location',
                    fullAddress: formatted,
                    street: formatted,
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'India',
                    isSynthesized: true,
                },
            ];
        }

        return matchedLocal;
    },

    /**
     * Resolve spelling and capitalization variations for an input location
     * @param {string} rawInput 
     * @returns {Object|null} Standardized place details or null
     */
    resolveStandardizedPlace(rawInput) {
        if (!rawInput || typeof rawInput !== 'string') return null;
        const clean = rawInput.trim().toLowerCase();
        for (const place of STANDARDIZED_PLACES) {
            if (
                place.primaryText.toLowerCase() === clean ||
                place.aliases.some((alias) => alias === clean || clean.includes(alias))
            ) {
                return { ...place };
            }
        }
        return null;
    },
};

export default locationAutocompleteService;
