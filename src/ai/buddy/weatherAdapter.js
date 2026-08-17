/**
 * Travel AI Buddy — Weather Context Adapter
 * 
 * Provides an interface for retrieving and formatting weather conditions,
 * detecting significant weather changes, and testing mock conditions.
 */
(function (global) {
    class WeatherAdapter {
        constructor() {
            this.lastWeather = null;
            this.lastCheckTime = 0;
            this.listeners = new Set();
        }

        /**
         * Get current weather condition object
         * @param {string} [destination='Paris']
         * @returns {Object} { condition, temperature, precipitationProbability, severity, isOutdoorFriendly }
         */
        getCurrentWeather(destination = 'Paris') {
            if (this.lastWeather) return { ...this.lastWeather };

            // Default mock weather (Development fallback)
            return {
                destination: destination || 'Paris',
                condition: 'sunny',
                temperature: 24,
                precipitationProbability: 10,
                severity: 'normal',
                isOutdoorFriendly: true,
                isMock: true
            };
        }

        /**
         * Update or mock weather conditions
         * @param {Object|string} data 
         * @returns {{ changed: boolean, weather: Object }}
         */
        updateWeather(data) {
            let parsed = {};
            if (typeof data === 'string') {
                const lower = data.toLowerCase();
                const isRain = lower.includes('rain') || lower.includes('storm') || lower.includes('shower');
                const isSnow = lower.includes('snow') || lower.includes('blizzard');
                parsed = {
                    condition: isRain ? (lower.includes('heavy') ? 'heavy_rain' : 'rain') : (isSnow ? 'snow' : 'sunny'),
                    temperature: lower.includes('cold') ? 8 : (lower.includes('hot') ? 32 : 22),
                    precipitationProbability: isRain ? 85 : 10,
                    severity: (lower.includes('heavy') || lower.includes('warning') || lower.includes('storm')) ? 'warning' : 'normal',
                    isOutdoorFriendly: !isRain && !isSnow
                };
            } else if (data && typeof data === 'object') {
                const cond = data.condition || 'sunny';
                const isRain = cond.includes('rain') || cond.includes('storm');
                const isSnow = cond.includes('snow');
                parsed = {
                    condition: cond,
                    temperature: data.temperature ?? 22,
                    precipitationProbability: data.precipitationProbability ?? (isRain ? 80 : 15),
                    severity: data.severity || (cond.includes('heavy') ? 'warning' : 'normal'),
                    isOutdoorFriendly: data.isOutdoorFriendly ?? (!isRain && !isSnow),
                    isMock: Boolean(data.isMock)
                };
            }

            const changed = !this.lastWeather || 
                this.lastWeather.condition !== parsed.condition ||
                this.lastWeather.severity !== parsed.severity;

            this.lastWeather = parsed;
            this.lastCheckTime = Date.now();

            if (changed) {
                this.notifyListeners(parsed);
            }

            return { changed, weather: parsed };
        }

        onWeatherChange(listener) {
            this.listeners.add(listener);
            if (this.lastWeather) listener(this.lastWeather);
            return () => this.listeners.delete(listener);
        }

        notifyListeners(weather) {
            for (const listener of this.listeners) {
                try {
                    listener(weather);
                } catch (e) {
                    console.error('[WeatherAdapter] Error in listener:', e);
                }
            }
        }
    }

    const weatherAdapter = new WeatherAdapter();

    global.WeatherAdapter = WeatherAdapter;
    global.weatherAdapter = weatherAdapter;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { WeatherAdapter, weatherAdapter };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
