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
const { readKeystore, addKeystore } = require('./util/keystore');

const keystorePath = './keystore.json';

const logger = Logger(argv.logFolder);

const network = argv.network || 'private';
const infuraApiKey = process.env.INFURA_API_KEY;

const config = Config({ network, infuraApiKey });

const web3 = new Web3(config.eth.rpcUrl);

const initService = async () => {
    if (fs.existsSync(keystorePath)) {
        console.error('The service has already been initialized.');
        process.exit(1);
    }

    await addKeystore(keystorePath, web3);

    // TODO: Add better explanation; also mention that they can backup private key
    // by running `node index.js --displayPk`
    console.log(`The account has been created. \nIMPORTANT: 
    Please backup keystore file ${keystorePath} into a secure location. 
    The keystore file is the only way to recover your account.`);
};

let networkName;
const startService = async () => {
    if (!fs.existsSync(keystorePath)) {
        // TODO: Add more discriptive instructions
        logger.error('Keystore doesn\'t exist. Please run with `--init` parameter to initialize the service');
        process.exit(1);
    }

    // Ask for the account password
    const pwd = (await inquirer.prompt(keystorePrompts.enterKeystorePassword))
        .enterKeystorePassword;

    let account;

    try {
        account = await readKeystore(keystorePath, web3, pwd);
    } catch (error) {
        logger.error(error);
        process.exit(1);
    }

    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    // Display the network
    try {
        networkName = await web3.eth.net.getNetworkType();
        logger.info(`Connected to ${networkName} network`);
    } catch (error) {
        logger.error(`Error while retrieving the network type: ${error}. Shutting down.`);
        process.exit(1);
    }

    // Display the account balance
    const balance = web3.utils.fromWei(await web3.eth.getBalance(web3.eth.defaultAccount));
    logger.info(`Your address: ${web3.eth.defaultAccount}`);
    logger.info(`Your account balance: ${balance} ETH`);

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
    routes(app, web3, config, ipfs, logger);

    // Start an http server
    const port = argv.port || 8080;
    const server = new Server(app, port, console);
    server.start(port);
};

if (argv.init) {
    initService();
} else {
    startService();
}
