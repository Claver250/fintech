const crypto = require('crypto');

/**
 * OTP Utilities for Fintech Security
 */
const OTPUtils = {
    /**
     * Generates a cryptographically secure numeric OTP
     * @param {number} length - Default 6 digits
     */
    generate: (length = 6) => {
        if (length < 4 || length > 10) throw new Error("OTP length must be between 4 and 10");
        
        // Generate secure random bytes
        const digits = '0123456789';
        let otp = '';
        const randomBytes = crypto.randomBytes(length);
        
        for (let i = 0; i < length; i++) {
        otp += digits[randomBytes[i] % 10];
        }
        return otp;
    },

    /**
     * Hashes OTP for secure storage
     * NEVER store the raw OTP in your database or cache
     */
    hash: (otp) => {
        return crypto.createHash('sha256').update(otp).digest('hex');
    },

    /**
     * Validates a provided OTP against a stored hash
     */
    verify: (providedOtp, storedHash) => {
        const hashedInput = crypto.createHash('sha256').update(providedOtp).digest('hex');
        // Constant-time comparison to prevent timing attacks
        return crypto.timingSafeEqual(Buffer.from(hashedInput), Buffer.from(storedHash));
    }
};

module.exports = OTPUtils;