module.exports = [
"[project]/src/shared/utils/apiKey.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateApiKeyWithMachine",
    ()=>generateApiKeyWithMachine,
    "isNewFormatKey",
    ()=>isNewFormatKey,
    "parseApiKey",
    ()=>parseApiKey,
    "verifyApiKeyCrc",
    ()=>verifyApiKeyCrc
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const API_KEY_SECRET = process.env.API_KEY_SECRET || "endpoint-proxy-api-key-secret";
/**
 * Generate 6-char random keyId
 */ function generateKeyId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for(let i = 0; i < 6; i++){
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * Generate CRC (8-char HMAC)
 */ function generateCrc(machineId, keyId) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHmac("sha256", API_KEY_SECRET).update(machineId + keyId).digest("hex").slice(0, 8);
}
function generateApiKeyWithMachine(machineId) {
    const keyId = generateKeyId();
    const crc = generateCrc(machineId, keyId);
    const key = `sk-${machineId}-${keyId}-${crc}`;
    return {
        key,
        keyId
    };
}
function parseApiKey(apiKey) {
    if (!apiKey || !apiKey.startsWith("sk-")) return null;
    const parts = apiKey.split("-");
    // New format: sk-{machineId}-{keyId}-{crc8} = 4 parts
    if (parts.length === 4) {
        const [, machineId, keyId, crc] = parts;
        // Validate CRC
        const expectedCrc = generateCrc(machineId, keyId);
        if (crc !== expectedCrc) return null;
        return {
            machineId,
            keyId,
            isNewFormat: true
        };
    }
    // Old format: sk-{random8} = 2 parts
    if (parts.length === 2) {
        return {
            machineId: null,
            keyId: parts[1],
            isNewFormat: false
        };
    }
    return null;
}
function verifyApiKeyCrc(apiKey) {
    const parsed = parseApiKey(apiKey);
    if (!parsed) return false;
    // Old format doesn't have CRC, always valid if parsed
    if (!parsed.isNewFormat) return true;
    // New format already verified in parseApiKey
    return true;
}
function isNewFormatKey(apiKey) {
    const parsed = parseApiKey(apiKey);
    return parsed?.isNewFormat === true;
}
}),
];

//# sourceMappingURL=src_shared_utils_apiKey_0dq53wj.js.map