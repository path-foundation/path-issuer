/* eslint no-restricted-syntax: off, no-await-in-loop: off */
const Resolver = require('truffle-resolver');
const path = require('path');

const artifacts = new Resolver({
    // Project directory
    working_directory: path.resolve(`${__dirname}/../../`),
    // Artifacts directory
    contracts_build_directory: path.resolve(`${__dirname}/../../node_modules/path-protocol-artifacts/abi`),
});

//const web3 = new Web3('http://127.0.0.1:7545');

const contractNames = [
    'Issuers',
    'Certificates',
    'PathToken',
    'PublicKeys',
    'Escrow',
];

module.exports = async (web3, from) => {
    // Setup contract artifacts
    const contractArtifacts = {};
    
    contractNames.forEach((contract, i) => {
        const a = artifacts.require(contract);
        a.setProvider(web3.currentProvider);
        contractArtifacts[contractNames[i]] = a;
    });

    // Deploy contracts
    const instances = [];

    // for (const ca of contractArtifacts) {
    //     const instance = await ca.new({ from });
    //     instances.push(instance);
    // }

    const issuersInstance = await contractArtifacts.Issuers.new({ from });
    const certificatesInstance = await contractArtifacts.Certificates.new(issuersInstance.address, { from });
    const pathTokenInstance = await contractArtifacts.PathToken.new({ from });
    const publicKeysInstance = await contractArtifacts.PublicKeys.new({ from });
    const escrowInstance = await contractArtifacts.Escrow.new(
        pathTokenInstance.address,
        certificatesInstance.address,
        publicKeysInstance.address,
        { from }
    );

    instances.push(issuersInstance);
    instances.push(certificatesInstance);
    instances.push(pathTokenInstance);
    instances.push(publicKeysInstance);
    instances.push(escrowInstance);

    const map = {};

    // Map contract names to deployed addresses
    contractNames.forEach((c, i) => { map[c] = instances[i].address; });

    return map;
};
