/**
 * Travel AI Buddy — Step 6: Mock Travel Datasets
 * 
 * Provides offline development mock data for destinations, places, routes,
 * weather conditions, hotels, and flights.
 */
(function (global) {
    const TRAVEL_MOCK_DATA = {
        destinations: {
            Paris: {
                weather: {
                    condition: 'sunny',
                    temperature: 24,
                    feelsLike: 25,
                    precipitationProbability: 10,
                    windSpeed: 12,
                    severity: 'normal'
                },
                rainWeather: {
                    condition: 'heavy_rain',
                    temperature: 15,
                    feelsLike: 13,
                    precipitationProbability: 85,
                    windSpeed: 28,
                    severity: 'warning'
                },
                places: [
                    {
                        id: 'eiffel_tower',
                        name: 'Eiffel Tower',
                        category: 'landmark',
                        rating: 4.8,
                        priceLevel: 3,
                        isOutdoor: true,
                        distanceMeters: 1200,
                        openingHours: { isOpen: true, opensAt: '09:00', closesAt: '23:45', closesSoon: false }
                    },
                    {
                        id: 'louvre_museum',
                        name: 'Louvre Museum',
                        category: 'museum',
                        rating: 4.9,
                        priceLevel: 2,
                        isOutdoor: false,
                        distanceMeters: 2800,
                        openingHours: { isOpen: true, opensAt: '09:00', closesAt: '18:00', closesSoon: false }
                    },
                    {
                        id: 'orsay_museum',
                        name: 'Musée d\'Orsay',
                        category: 'museum',
                        rating: 4.8,
                        priceLevel: 2,
                        isOutdoor: false,
                        distanceMeters: 2100,
                        openingHours: { isOpen: true, opensAt: '09:30', closesAt: '18:00', closesSoon: true } // closing soon test
                    },
                    {
                        id: 'tuileries_garden',
                        name: 'Tuileries Garden',
                        category: 'park',
                        rating: 4.7,
                        priceLevel: 1,
                        isOutdoor: true,
                        distanceMeters: 2400,
                        openingHours: { isOpen: true, opensAt: '07:00', closesAt: '21:00', closesSoon: false }
                    }
                ],
                hotels: [
                    {
                        id: 'hotel_ritz',
                        name: 'The Ritz Paris',
                        pricePerNight: 85000,
                        totalPrice: 170000,
                        rating: 4.9,
                        location: 'Place Vendôme',
                        distanceKm: 0.5,
                        amenities: ['Spa', 'Pool', 'Fine Dining', 'WiFi']
                    },
                    {
                        id: 'hotel_marais',
                        name: 'Hôtel Le Marais Boutique',
                        pricePerNight: 16000,
                        totalPrice: 32000,
                        rating: 4.6,
                        location: 'Le Marais',
                        distanceKm: 1.2,
                        amenities: ['Breakfast Included', 'WiFi', 'City View']
                    },
                    {
                        id: 'hotel_city_inn',
                        name: 'Paris City Center Inn',
                        pricePerNight: 8500,
                        totalPrice: 17000,
                        rating: 4.3,
                        location: 'Bastille',
                        distanceKm: 2.1,
                        amenities: ['Free WiFi', 'AC']
                    }
                ],
                flights: [
                    {
                        id: 'af_214',
                        airline: 'Air France',
                        departure: '08:30',
                        arrival: '13:45',
                        duration: '9h 15m',
                        stops: 0,
                        price: 52000,
                        previousPrice: 52000,
                        baggage: '2 Checked Bags'
                    },
                    {
                        id: 'sk_501',
                        airline: 'Sky Express (Deal)',
                        departure: '11:00',
                        arrival: '16:30',
                        duration: '9h 30m',
                        stops: 0,
                        price: 38000,
                        previousPrice: 48000, // Price drop of ₹10,000!
                        baggage: '1 Checked Bag'
                    }
                ],
                routes: {
                    'Eiffel Tower::Louvre Museum': {
                        origin: 'Eiffel Tower',
                        destination: 'Louvre Museum',
                        distanceMeters: 3800,
                        durationSeconds: 2100, // 35 min walk
                        mode: 'walking',
                        traffic: 'normal'
                    },
                    'Louvre Museum::Musée d\'Orsay': {
                        origin: 'Louvre Museum',
                        destination: 'Musée d\'Orsay',
                        distanceMeters: 950,
                        durationSeconds: 720, // 12 min walk
                        mode: 'walking',
                        traffic: 'light'
                    }
                }
            }
        }
    };

    global.TRAVEL_MOCK_DATA = TRAVEL_MOCK_DATA;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TRAVEL_MOCK_DATA };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
