/**
 * Travel AI Buddy — Step 6: Travel Data Normalizer
 * 
 * Mandatory architectural layer: Normalizes raw third-party/API payloads into
 * standardized, type-safe internal schemas before passing to Travel Context or AI.
 */
(function (global) {
    class TravelDataNormalizer {
        /**
         * Normalize Weather data
         */
        static normalizeWeather(raw, defaultLocation = 'Paris') {
            if (!raw) return null;

            const locName = typeof raw.location === 'string'
                ? raw.location
                : (raw.location?.name || raw.name || defaultLocation);

            const temp = Number(raw.temperature ?? raw.temp ?? 22);
            const feels = Number(raw.feelsLike ?? raw.feels_like ?? temp);
            const condition = String(raw.condition || raw.weather?.[0]?.main || 'sunny').toLowerCase();
            const isRain = condition.includes('rain') || condition.includes('storm') || condition.includes('shower');
            const isSnow = condition.includes('snow');
            const precip = Number(raw.precipitationProbability ?? raw.pop ?? (isRain ? 85 : 10));
            const wind = Number(raw.windSpeed ?? raw.wind_speed ?? 12);
            const severity = raw.severity || ((isRain && precip > 75) || wind > 50 ? 'warning' : 'normal');

            return {
                location: {
                    name: locName,
                    latitude: raw.location?.latitude || raw.coord?.lat || null,
                    longitude: raw.location?.longitude || raw.coord?.lon || null
                },
                temperature: Math.round(temp),
                feelsLike: Math.round(feels),
                condition,
                precipitationProbability: precip,
                windSpeed: Math.round(wind),
                severity,
                isOutdoorFriendly: !isRain && !isSnow && temp >= 10 && temp <= 35,
                timestamp: raw.timestamp || Date.now()
            };
        }

        /**
         * Normalize Place entity
         */
        static normalizePlace(raw) {
            if (!raw) return null;

            const name = String(raw.name || raw.title || 'Attraction');
            const category = String(raw.category || raw.type || 'landmark').toLowerCase();
            const rating = Number(raw.rating || 4.5);
            const priceLevel = raw.priceLevel ?? raw.price_level ?? 2;
            const distance = Number(raw.distance || raw.distanceMeters || 500);

            // Determine if indoor / outdoor
            const outdoorCategories = ['park', 'garden', 'beach', 'viewpoint', 'square', 'tower', 'outdoor'];
            const isOutdoor = raw.isOutdoor ?? outdoorCategories.some(c => category.includes(c) || name.toLowerCase().includes(c));

            // Normalized opening hours
            let openingHours = null;
            if (raw.openingHours || raw.hours) {
                const h = raw.openingHours || raw.hours;
                const nowHour = new Date().getHours();
                const closeHour = h.closesAt ? parseInt(h.closesAt) : 18;
                const closesSoon = Boolean(h.isOpen && (closeHour - nowHour <= 1 && closeHour - nowHour >= 0));

                openingHours = {
                    isOpen: h.isOpen !== false,
                    opensAt: h.opensAt || '09:00',
                    closesAt: h.closesAt || '18:00',
                    closesSoon,
                    nextOpeningTime: h.nextOpeningTime || null
                };
            }

            return {
                id: String(raw.id || raw.place_id || name.toLowerCase().replace(/\s+/g, '_')),
                name,
                category,
                location: raw.location || raw.address || 'Central District',
                rating: Math.min(5.0, Math.max(1.0, rating)),
                priceLevel,
                isOutdoor,
                openingHours,
                distanceMeters: distance,
                distanceKm: Number((distance / 1000).toFixed(1))
            };
        }

        /**
         * Normalize Route information
         */
        static normalizeRoute(raw) {
            if (!raw) return null;

            const distMeters = Number(raw.distanceMeters ?? raw.distance ?? 2500);
            const durSeconds = Number(raw.durationSeconds ?? raw.duration ?? 900);
            const durMinutes = Math.round(durSeconds / 60);

            return {
                origin: String(raw.origin || 'Origin'),
                destination: String(raw.destination || 'Destination'),
                distanceMeters: distMeters,
                distanceKm: Number((distMeters / 1000).toFixed(1)),
                durationSeconds: durSeconds,
                durationMinutes: durMinutes,
                mode: raw.mode || 'walking',
                traffic: raw.traffic || 'normal',
                isTightTransfer: durMinutes > 30
            };
        }

        /**
         * Normalize Hotel entity
         */
        static normalizeHotel(raw) {
            if (!raw) return null;

            const name = String(raw.name || raw.hotelName || 'Hotel');
            const price = Number(raw.pricePerNight || raw.price || raw.totalPrice || 15000);
            const rating = Number(raw.rating || 4.2);
            const distance = Number(raw.distanceKm || raw.distance || 1.5);

            return {
                id: String(raw.id || raw.hotelId || name.toLowerCase().replace(/\s+/g, '_')),
                name,
                pricePerNight: price,
                totalPrice: raw.totalPrice || price,
                rating: Math.min(5.0, Math.max(1.0, rating)),
                location: raw.location || 'City Center',
                distanceKm: distance,
                amenities: Array.isArray(raw.amenities) ? raw.amenities : ['WiFi', 'Breakfast'],
                cancellationPolicy: raw.cancellationPolicy || 'Free cancellation up to 24h'
            };
        }

        /**
         * Normalize Flight entity
         */
        static normalizeFlight(raw) {
            if (!raw) return null;

            const airline = String(raw.airline || 'Sky Airways');
            const price = Number(raw.price || raw.amount || 20000);
            const prevPrice = Number(raw.previousPrice || price);
            const priceDrop = prevPrice > price ? prevPrice - price : 0;

            return {
                id: String(raw.id || raw.flightNumber || 'FL_101'),
                airline,
                departure: raw.departure || '10:00',
                arrival: raw.arrival || '14:30',
                duration: raw.duration || '4h 30m',
                stops: Number(raw.stops ?? 0),
                price,
                previousPrice: prevPrice,
                priceDrop,
                isBetterDeal: priceDrop > 2000,
                baggage: raw.baggage || '1 Cabin + 1 Check-in'
            };
        }
    }

    global.TravelDataNormalizer = TravelDataNormalizer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TravelDataNormalizer };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
