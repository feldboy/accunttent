"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientDetails = exports.isClientRegistered = void 0;
const isClientRegistered = async (telegramId) => {
    // TODO: Implement Google Sheets lookup
    // For POC, return true or check a mock list
    return true;
};
exports.isClientRegistered = isClientRegistered;
const getClientDetails = async (telegramId) => {
    // Return mock data
    return {
        id: telegramId,
        name: 'Mock Client',
        phone: '0500000000'
    };
};
exports.getClientDetails = getClientDetails;
