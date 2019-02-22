/* eslint max-len: off */

const pathApi = require('path-protocol-js-api');
const crypto = require('crypto');
const EthCrypto = require('eth-crypto');

module.exports = {
    submitCertificate: async (userAddress, certificateJson, ipfs, web3, addresses) => {
        // Retrieve user's public key from PublicKeys contract
        const pubKeysApi = new pathApi.Pubkeys(web3.currentProvider, addresses.PublicKeys);
        const userPublicKey = await pubKeysApi.getPublicKey(userAddress);

        if (!userPublicKey || userPublicKey === '0x0') throw new Error(`No public key found for user address ${userAddress} in PublicKeys contract`);

        const sha256 = crypto.createHash('sha256');

        const encryptedCert = await EthCrypto.encryptWithPublicKey(userPublicKey, certificateJson);
        const compressedCert = EthCrypto.cipher.stringify(encryptedCert);
        const certificateHash = sha256.update(certificateJson).digest('hex');

        // Place the encrypted cert on ipfs
        const res = await ipfs.files.add(Buffer.from(compressedCert), { hash: 'sha2-256' });
        const ipfsLocator = res[0].hash;

        // Instantiate Certificates Api
        const certificatesApi = new pathApi.Certificates(web3.currentProvider, addresses.Certificates);

        // Place the hashed cert on the blockchain
        await certificatesApi.addCertificate(userAddress, certificateHash, web3.eth.defaultAccount);

        // Return the ipfs locator of the certificate
        return { ipfsLocator, certificateHash };
    },

    getCertificateMetadata: async (userAddress, certificateHash, web3, addresses) => {
        const certificatesApi = new pathApi.Certificates(web3.currentProvider, addresses.Certificates);

        const { issuer, revoked } = await certificatesApi.getCertificateMetadata(userAddress, certificateHash);
        return { issuer, revoked };
    },

    revokeCertificate: async (userAddress, certId, web3, addresses) => {
        const certificatesApi = new pathApi.Certificates(web3.currentProvider, addresses.Certificates);
        await certificatesApi.revokeCertificate(userAddress, certId, web3.eth.defaultAccount);
    },
};
