/* eslint max-len: off */
const Web3 = require('web3');
const assert = require('assert');
const pathApi = require('path-protocol-js-api');
const crypto = require('crypto');
const ipfsApi = require('ipfs-api');
const EthCrypto = require('eth-crypto');

const config = require('../config/config')({ network: 'private' });

const ipfs = ipfsApi(config.ipfs);

const sha256 = crypto.createHash('sha256');

const { generateAddressesFromSeed } = require('./util/keys');
const { submitCertificate, getCertificateMetadata, revokeCertificate } = require('../controllers/certificateController');
const deployContracts = require('./util/deployContracts');

//const privateKey = '0x55e00820399a41b9e1334219483c665cdb9808db9eacdbcea01c9cea0f1ef6bc';
// const publicKey = '00a15dc3691b4e3830945378b69a1022a9aac2f154ba57a7eaa182781af9da686603755194a31996a01214b81d07cbc915b26b10b39bd3b890927ead3029562a';
// const address = '0xf76ea4aE458f6ae339E9dC1569164f3882626F48';

// Encrypted test certificate
// const ipfsCert = `15a54b06f0001e018ff9ba9ef42c678402b9c29dc40113f30a2
//                   951be1c6c17594e59127029d2888efdbbca85f0d31f758851da
//                   7b60ad2d57c98e53b0fc8831ae8ad696bebf7225cc1c72e6f22
//                   7fc7c1ab24966892c9eb15d94ae4bfd90b358eb2f8d65a2fe93
//                   bf4a66fc7f3f63d938859cf3ae71606fd37e9f1a36e43e3a530
//                   72dfb586233650932ba0bd7cdd208cba093ddb37685e1e6d7b9
//                   b64357da64eee646`;

const fakeIpfsHash = 'QmUzzU6cFR1a1JD4yGmUJfKMEyF58VCz9CuZZcDLaR4kbR';

// IF YOU CHANGE THIS, ALSO UPDATE ipfsHash and ipfsCert variables
const cert = JSON.stringify({
    name: 'John Smith',
    title: 'AWS Certified Developer',
    issuer: 'Amazon',
});

const certHash = sha256.update(cert).digest('hex');

const keys = generateAddressesFromSeed(process.env.TEST_MNEMONIC, 10);

const identities = {
    owner: keys[0],
    issuer: keys[1],
    user: keys[2],
};

describe('Testing submitCertificate controller', () => {
    let fakeIpfs,
        web3;

    before(async () => {
        // Create IPFS fake
        fakeIpfs = {
            files: {
                add: async () => [{ hash: fakeIpfsHash }],
            },
        };

        // Load private config
        web3 = new Web3(config.eth.rpcUrl);

        web3.eth.defaultAccount = identities.issuer.address;

        // Deploy contracts
        config.addresses = await deployContracts(web3, identities.owner.address);

        // Add public keys for knwon addresses to the PublicKeys contract
        const pubkeys = new pathApi.Pubkeys(web3.currentProvider, config.addresses.PublicKeys);
        await pubkeys.addPublicKey(identities.owner.publicKey, identities.owner.address);
        await pubkeys.addPublicKey(identities.issuer.publicKey, identities.issuer.address);
        await pubkeys.addPublicKey(identities.user.publicKey, identities.user.address);

        // Whitelist the issuer
        const issuers = new pathApi.Issuers(web3.currentProvider, config.addresses.Issuers);
        await issuers.addIssuer(identities.issuer.address, identities.owner.address);
    });

    it('Submit a certificate (fake ipfs)', async () => {
        const { ipfsLocator, certificateHash } = await submitCertificate(identities.user.address, cert, fakeIpfs, web3, config.addresses);

        const { issuer, revoked } = await getCertificateMetadata(identities.user.address, certificateHash, web3, config.addresses);

        assert.equal(ipfsLocator, fakeIpfsHash, 'IPFS hash should match');
        assert.equal(certificateHash, certHash, 'Certificate hash should match');
        assert.equal(issuer.toLowerCase(), identities.issuer.address, 'Issuer address should match');
        assert.equal(revoked, false, 'Revoked status should be false');
    });

    it('Revoke a certificate', async () => {
        // Revoke a certificate added in the previous test
        await revokeCertificate(identities.user.address, certHash, web3, config.addresses);

        const { issuer, revoked } = await getCertificateMetadata(identities.user.address, certHash, web3, config.addresses);

        assert.equal(issuer.toLowerCase(), identities.issuer.address, 'Issuer address should match');
        assert.equal(revoked, true, 'Revoked status should be true');
    });

    it('Submit a certificate (real ipfs)', async () => {
        const newCert = JSON.stringify(Object.assign(JSON.parse(cert), { from: new Date().toISOString() }));
        const { ipfsLocator, certificateHash } = await submitCertificate(identities.user.address, newCert, ipfs, web3, config.addresses);

        const { issuer, revoked } = await getCertificateMetadata(identities.user.address, certificateHash, web3, config.addresses);

        // Retrieve the cert from ipfs and decrypt
        const encrypted = await ipfs.files.get(ipfsLocator);

        const decrypted = await EthCrypto.decryptWithPrivateKey(identities.user.privateKey, encrypted[0].content.toString());

        assert.equal(newCert, decrypted);

        assert.equal(issuer.toLowerCase(), identities.issuer.address, 'Issuer address should match');
        assert.equal(revoked, false, 'Revoked status should be false');
    });
});
