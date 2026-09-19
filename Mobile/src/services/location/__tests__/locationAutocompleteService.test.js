import { locationAutocompleteService, toTitleCase } from '../locationAutocompleteService';
import environment from '../../../config/environment';

describe('locationAutocompleteService', () => {
    describe('toTitleCase', () => {
        it('formats lowercase and mixed-case strings to Title Case', () => {
            expect(toTitleCase('katraj')).toBe('Katraj');
            expect(toTitleCase('pune maharashtra')).toBe('Pune Maharashtra');
            expect(toTitleCase('KARTAJ')).toBe('Kartaj');
            expect(toTitleCase('')).toBe('');
            expect(toTitleCase(null)).toBe('');
        });
    });

    describe('searchPlaces', () => {
        it('returns empty array for empty or short queries', async () => {
            expect(await locationAutocompleteService.searchPlaces('')).toEqual([]);
            expect(await locationAutocompleteService.searchPlaces('a')).toEqual([]);
            expect(await locationAutocompleteService.searchPlaces(null)).toEqual([]);
        });

        it('standardizes and resolves spelling variations like "katraj" vs. "Kartaj"', async () => {
            // Typing "katraj"
            const resultsKatraj = await locationAutocompleteService.searchPlaces('katraj');
            expect(resultsKatraj.length).toBeGreaterThan(0);
            expect(resultsKatraj[0].primaryText).toBe('Katraj');
            expect(resultsKatraj[0].city).toBe('Pune');
            expect(resultsKatraj[0].state).toBe('Maharashtra');
            expect(resultsKatraj[0].postalCode).toBe('411046');

            // Typing typo "kartaj"
            const resultsKartaj = await locationAutocompleteService.searchPlaces('kartaj');
            expect(resultsKartaj.length).toBeGreaterThan(0);
            expect(resultsKartaj[0].primaryText).toBe('Katraj');
            expect(resultsKartaj[0].city).toBe('Pune');
            expect(resultsKartaj[0].state).toBe('Maharashtra');
        });

        it('resolves other common Indian tech hubs and localities with spelling variations', async () => {
            const resultsKothrud = await locationAutocompleteService.searchPlaces('kotrud');
            expect(resultsKothrud[0].primaryText).toBe('Kothrud');

            const resultsHinjewadi = await locationAutocompleteService.searchPlaces('hinjwadi');
            expect(resultsHinjewadi[0].primaryText).toBe('Hinjewadi');

            const resultsBandra = await locationAutocompleteService.searchPlaces('bandra');
            expect(resultsBandra[0].city).toBe('Mumbai');
        });

        it('falls back to synthesized title-cased location when query is not in dictionary', async () => {
            const results = await locationAutocompleteService.searchPlaces('custom unlisted locality');
            expect(results.length).toBe(1);
            expect(results[0].primaryText).toBe('Custom Unlisted Locality');
            expect(results[0].isSynthesized).toBe(true);
        });

        it('integrates with Google Places API when API key is present', async () => {
            const originalKey = environment.googlePlacesApiKey;
            environment.googlePlacesApiKey = 'test-google-key';

            const mockGoogleResponse = {
                status: 'OK',
                predictions: [
                    {
                        place_id: 'google_place_123',
                        description: 'Katraj Snake Park, Pune, India',
                        structured_formatting: {
                            main_text: 'Katraj Snake Park',
                            secondary_text: 'Pune, India',
                        },
                    },
                ],
            };

            global.fetch = jest.fn().mockResolvedValueOnce({
                json: jest.fn().mockResolvedValueOnce(mockGoogleResponse),
            });

            const results = await locationAutocompleteService.searchPlaces('katraj');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('maps.googleapis.com/maps/api/place/autocomplete/json')
            );
            expect(results.some((r) => r.id === 'google_place_123')).toBe(true);

            // Restore
            environment.googlePlacesApiKey = originalKey;
        });
    });

    describe('resolveStandardizedPlace', () => {
        it('resolves standardized place directly for exact or alias match', () => {
            const place = locationAutocompleteService.resolveStandardizedPlace('kartaj');
            expect(place).not.toBeNull();
            expect(place.primaryText).toBe('Katraj');
            expect(place.city).toBe('Pune');

            const invalid = locationAutocompleteService.resolveStandardizedPlace('nonexistent123');
            expect(invalid).toBeNull();
        });
    });
});
