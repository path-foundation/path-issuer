/* eslint no-param-reassign: off, operator-linebreak: off */
const fs = require('fs');
const inquirer = require('inquirer');
const errors = require('../constants/errors');

const keystorePrompts = require('../prompts/keystore-prompts');
/**
 * @description Add the keystore from a new or an existig private key.
 * The function is interactive, asking for user input
 */
const addKeystore = async (keystorePath, web3) => {
    const answers = await inquirer.prompt([
        keystorePrompts.createOrImportPrivateKey,
        keystorePrompts.enterPrivateKey,
        keystorePrompts.enterNewKeystorePassword,
    ]);

    let account;
    if (answers[keystorePrompts.createOrImportPrivateKey.name] ===
        keystorePrompts.createOrImportPrivateKey.choices[0]) {
        // Import an existing private key
        const privateKey = answers[keystorePrompts.enterPrivateKey.name];
        account = web3.eth.accounts.wallet.add(`0x${privateKey}`);
    } else {
        // Create a new private key/account
        account = web3.eth.accounts.wallet.create(1, web3.utils.randomHex(32));
    }

    web3.eth.defaultAccount = account.address;

    // Encrypt and save to file
    const encrypted = account.encrypt(answers[keystorePrompts.enterNewKeystorePassword.name]);
    fs.writeFileSync(keystorePath, JSON.stringify(encrypted, null, 2));
};

/**
 * @description Reads the keystore file,
 * decrypts it using the provided password
 * and returns the decrypted account
 * @param pwd - password to unlock the account
 * @returns decrypted account
 */
const readKeystore = async (keystorePath, web3, pwd) => {
    // Retrieve the encrypted account from the keystore
    const keystore = fs.readFileSync(keystorePath).toString();

    // Parse the account string to json
    let encrypted;
    try {
        encrypted = JSON.parse(keystore);
    } catch (error) {
        // TODO: Add instructions to restore the keystore
        throw new Error(errors.keystoreFileCorrupt);
    }

    // decrypt the account
    let decrypted;
    try {
        decrypted = web3.eth.accounts.decrypt(encrypted, pwd);
    } catch (err) {
        if (err.message.includes('wrong password')) {
            throw new Error(errors.passwordIncorrect);
        } else {
            throw new Error(err);
        }
    }

    return decrypted;
};

module.exports = { readKeystore, addKeystore };
