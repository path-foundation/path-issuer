//const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');
const Web3 = require('web3');

const errors = require('../constants/errors');
const prompts = require('../prompts/keystore-prompts');

chai.use(chaiAsPromised);
const { expect } = chai;

const keystore = {
    version: 3,
    id: 'ee9ccf08-079c-433d-9fea-5541e2e1bf65',
    address: 'f76ea4ae458f6ae339e9dc1569164f3882626f48',
    crypto: {
        ciphertext: '7f04b91aede1266694344b78d2ecaa4b10116aec7a6354db789cebeb273bade0',
        cipherparams: {
            iv: '0c09d2914e4b22c84165f8e89b569b98',
        },
        cipher: 'aes-128-ctr',
        kdf: 'scrypt',
        kdfparams: {
            dklen: 32,
            salt: 'a807b9958a93636fdfab3ae7b85be8c5fa61d556eb0382f44b53d9831816fc25',
            n: 8192,
            r: 8,
            p: 1,
        },
        mac: '60752c3d8b307e3d111331d8c26f7d0d46ece178c3266b5be6b525927e71ec13',
    },
};

const pk = '0x55e00820399a41b9e1334219483c665cdb9808db9eacdbcea01c9cea0f1ef6bc';
const pwd = 'ppppppppp';

describe('Reading the keystore', async () => {
    let web3,
        keystoreUtil,
        keystoreUtilCorrupt,
        keystoreUtilInvalidV3Wallet;

    before(() => {
        web3 = new Web3();

        const fs = {
            readFileSync: () => JSON.stringify(keystore),
        };

        const fsCorrupt = {
            readFileSync: () => `${JSON.stringify(keystore)} }}`,
        };

        const fsInvalidV3Wallet = {
            readFileSync: () => JSON.stringify({ a: 'b' }),
        };

        keystoreUtil = proxyquire('../util/keystore.js', { fs });

        keystoreUtilCorrupt = proxyquire('../util/keystore.js', { fs: fsCorrupt });

        keystoreUtilInvalidV3Wallet = proxyquire('../util/keystore.js', { fs: fsInvalidV3Wallet });
    });

    it('Read the correct keystore with the correct password', async () => {
        const account = await keystoreUtil.readKeystore(null, web3, pwd);
        expect(account.privateKey).to.eql(pk);
    });

    it('Read the correct keystore with an incorrect password', () => {
        const promise = keystoreUtil.readKeystore(null, web3, 'blah');
        return expect(promise).to.be.rejectedWith(errors.passwordIncorrect);
    });

    it('Read a corrupt keystore (not JSON)', () => {
        const promise = keystoreUtilCorrupt.readKeystore(null, web3, 'blah');
        return expect(promise).to.be.rejectedWith(errors.keystoreFileCorrupt);
    });

    it('Read a corrupt keystore (unexpected JSON)', () => {
        const promise = keystoreUtilInvalidV3Wallet.readKeystore(null, web3, 'blah');
        return expect(promise).to.be.rejectedWith(errors.notValidWallet);
    });
});

describe('Adding a keystore', async () => {
    let web3,
        keystoreUtilImport,
        keystoreUtilCreate;
    before(() => {
        web3 = new Web3();

        const fs = { writeFileSync: () => {} };

        const inquirerImport = {
            prompt: async () => {
                const result = {};
                // Import
                [result[prompts.createOrImportPrivateKey.name]] = prompts.createOrImportPrivateKey.choices;
                // Private Key
                result[prompts.enterPrivateKey.name] = pk;
                // Password
                result[prompts.enterNewKeystorePassword.name] = pwd;
                return result;
            },
        };

        const inquirerCreate = {
            prompt: async () => {
                const result = {};
                // Import
                [, result[prompts.createOrImportPrivateKey.name]] = prompts.createOrImportPrivateKey.choices;
                // Password
                result[prompts.enterNewKeystorePassword.name] = pwd;
                return result;
            },
        };

        keystoreUtilImport = proxyquire('../util/keystore.js', { fs, inquirer: inquirerImport });
        keystoreUtilCreate = proxyquire('../util/keystore.js', { fs, inquirer: inquirerCreate });
    });

    it('Import an existing private key', async () => {
        const encrypted = await keystoreUtilImport.addKeystore('', web3);
        const account = web3.eth.accounts.decrypt(JSON.stringify(encrypted), pwd);
        expect(account.privateKey).to.eql(pk);
    });

    it('Create a private key', async () => {
        const encrypted = await keystoreUtilCreate.addKeystore('', web3);
        const account = web3.eth.accounts.decrypt(JSON.stringify(encrypted), pwd);
        expect(account).to.have.property('address');
        expect(account).to.have.property('privateKey');
    });
});
