export const isClientRegistered = async (telegramId: number | string): Promise<boolean> => {
    // TODO: Implement Google Sheets lookup
    // For POC, return true or check a mock list
    return true;
};

export const getClientDetails = async (telegramId: number | string) => {
    // Return mock data
    return {
        id: telegramId,
        name: 'Mock Client',
        phone: '0500000000'
    };
};
