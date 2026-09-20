/**
 * Formatters
 * Currency, date, and display formatting utilities
 */

/**
 * Format currency amount
 * @param {number} amount
 * @param {string} currency - Currency code (default: INR)
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'INR', options = {}) => {
    const isExact = options.exact || options.minimumFractionDigits === 2;
    if (amount == null || isNaN(amount)) {
        return isExact ? '₹0.00' : '₹0';
    }
    
    const amountNum = Number(amount);
    const hasDecimals = amountNum % 1 !== 0;
    const shouldShowDecimals = isExact || hasDecimals;
    
    const num = isExact ? amountNum : (hasDecimals ? amountNum : Math.round(amountNum));
    const minDigits = options.minimumFractionDigits !== undefined ? options.minimumFractionDigits : (shouldShowDecimals ? 2 : 0);
    const maxDigits = options.maximumFractionDigits !== undefined ? options.maximumFractionDigits : (shouldShowDecimals ? 2 : 0);

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits,
    }).format(num);
};

/**
 * Format time range or single time if start and end are identical.
 * Also supports multi-day bookings.
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {string}
 */
export const formatTimeRange = (start, end) => {
    if (!start && !end) return '';
    if (!start) return formatTime(end);
    if (!end) return formatTime(start);

    const startTime = formatTime(start);
    const endTime = formatTime(end);

    const startDateStr = formatDate(start);
    const endDateStr = formatDate(end);
    if (startDateStr && endDateStr && startDateStr !== endDateStr) {
        return `${startTime} - ${endDateStr} ${endTime}`;
    }

    // If start and end times are identical on the same day, display single time
    if (startTime === endTime) {
        return startTime;
    }

    return `${startTime} - ${endTime}`;
};

/**
 * Format date to readable string
 * @param {string|Date} date
 * @param {Object} options
 * @returns {string}
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    const d = new Date(date);
    const defaults = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options,
    };
    return d.toLocaleDateString('en-IN', defaults);
};

/**
 * Format time
 * @param {string|Date} date
 * @returns {string}
 */
export const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Format date and time together
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
    if (!date) return '';
    return `${formatDate(date)} ${formatTime(date)}`;
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
};

/**
 * Format address from parking space data
 * @param {Object} parking
 * @returns {string}
 */
export const formatAddress = (parking) => {
    if (!parking) return '';
    const parts = [parking.address, parking.city, parking.state].filter(Boolean);
    return parts.join(', ');
};

/**
 * Truncate text with ellipsis
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength).trim() + '...';
};

/**
 * Format rating as stars display
 * @param {number} rating
 * @returns {string}
 */
export const formatRating = (rating) => {
    if (rating == null) return '0.0';
    return Number(rating).toFixed(1);
};

/**
 * Check if a URL is a meme, mock placeholder, or generic placeholder
 * @param {string} url
 * @returns {boolean}
 */
export const isMemeOrPlaceholderUrl = (url) => {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase().trim();
    if (!lower || lower.startsWith('data:image/svg')) return false;
    return (
        lower.includes('tokenfeller') ||
        lower.includes('meme') ||
        lower.includes('via.placeholder.com') ||
        lower.includes('placeholder.com')
    );
};

/**
 * Get an array of image URLs for a parking space, filtering out memes and placeholders
 * @param {Object} parking
 * @returns {Array<string>}
 */
export const getParkingImageUrls = (parking) => {
    if (!parking) return [];
    
    let raw = [];
    if (Array.isArray(parking.imageUrls) && parking.imageUrls.length > 0) {
        raw = parking.imageUrls;
    } else if (Array.isArray(parking.images) && parking.images.length > 0) {
        raw = parking.images;
    } else if (typeof parking.imageUrl === 'string' && parking.imageUrl.trim() !== '') {
        raw = [parking.imageUrl];
    }
    
    return raw.filter((url) => !isMemeOrPlaceholderUrl(url));
};
