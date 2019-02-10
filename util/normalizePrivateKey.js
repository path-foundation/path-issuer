module.exports = (pk) => {
    if (pk.startsWith('0x')) return pk;
    return `0x${pk}`;
};
