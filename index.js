/* eslint no-console: off, operator-linebreak: off */
const fs = require('fs');
const Web3 = require('web3');
const express = require('express');
const ipfsApi = require('ipfs-api');
const argv = require('minimist')(process.argv.slice(2));
const inquirer = require('inquirer');

const Server = require('./middleware/server.js');
const routes = require('./middleware/routes.js');
const Config = require('./config/config.js');
const Logger = require('./logging/logger.js');
const keystorePrompts = require('./prompts/keystore-prompts');

const keystorePath = './keystore.json';

const logger = Logger(argv.logFolder);

const network = argv.network || 'private';
const infuraApiKey = process.env.INFURA_API_KEY;

const config = Config({ network, infuraApiKey });

const web3 = new Web3(config.eth.rpcUrl);

// Interactive function to import a key or create a new one
const addKeystore = async () => {
    const answers = await inquirer.prompt([
        keystorePrompts.createOrImportPrivateKey,
        keystorePrompts.enterPrivateKey,
        keystorePrompts.enterKeystorePassword,
    ]);

    let account;
    if (answers[keystorePrompts.createOrImportPrivateKey.name] ===
        keystorePrompts.createOrImportPrivateKey.choices[0]) {
        // Export an existing private key
        const privateKey = answers[keystorePrompts.enterPrivateKey.name];
        account = web3.eth.accounts.wallet.add(`0x${privateKey}`);
    } else {
        // Create a new private key/account
        account = web3.eth.accounts.wallet.create(1, web3.utils.randomHex(32));
    }

    web3.eth.defaultAccount = account.address;

    // Encrypt and save to file
    const encrypted = account.encrypt(answers[keystorePrompts.enterKeystorePassword.name]);
    console.log(encrypted);
    fs.writeFileSync(keystorePath, JSON.stringify(encrypted, null, 2));
};

const initService = async () => {
    if (fs.existsSync(keystorePath)) {
        const keystore = fs.readFileSync(keystorePath);
    }
}

let networkName;
const startService = async () => {
    // 1. Check for the private key and build one if missing
    if (fs.existsSync(keystorePath)) {
        const keystore = fs.readFileSync(keystorePath);

    }

    if (!fs.existsSync('./keystore')) {
        await addKeystore();
    }

    // Display the network
    try {
        networkName = await web3.eth.net.getNetworkType();
        logger.info(`Connected to ${networkName} network`);
    } catch (error) {
        logger.error(`Error while retrieving the account balance: ${error}. Shutting down.`);
        process.exit(1);
    }

    // Display the account balance
    const balance = web3.utils.fromWei(await web3.eth.getBalance(web3.eth.defaultAccount));
    logger.info(`Your account balance: ${balance}`);

    // Create IPFS client
    const ipfs = ipfsApi(config.ipfs);

    // Check IPFS connectivity
    try {
        await ipfs.id();
    } catch (err) {
        console.error(`Failed to connect to IPFS: ${err}`);
        process.exit(1);
    }

    // create express app
    const app = express();

    // Add routes
    routes(app, web3, config, ipfs);

    // Start an http server
    const port = argv.port || 8080;
    const server = new Server(app, port, console);
    server.start(port);
};

startService();
