const Web3 = require('web3');

module.exports = {
    createOrImportPrivateKey: {
        type: 'list',
        name: 'createOrImportPrivateKey',
        message: 'Do you want to import an existing private key or create a new one?',
        choices: ['Import existing private key', 'Create a new private key'],
    },
    enterPrivateKey: {
        type: 'password',
        name: 'enterPrivateKey',
        message: 'Please enter the private key',
        validate: (input) => new Promise((resolve, reject) => {
            // Just a simple check to make sure an account can be generated from the private key entered
            try {
                (new Web3()).eth.accounts.privateKeyToAccount(input);
                resolve(true);
            } catch (error) {
                reject(new Error('Private key is not in correct format'));
            }
        }),
        when: (answers) => answers.createOrImportPrivateKey === 'Import existing private key',
    },
    enterNewKeystorePassword: {
        type: 'password',
        name: 'enterNewKeystorePassword',
        message: 'Enter the password to encrypt your account',
        validate: (input) => new Promise((resolve, reject) => {
            if (input && input.length >= 8) resolve(true);
            else reject(new Error('Password is too short (8 characters min)'));
        }),
    },
    reenterNewKeystorePassword: {
        type: 'password',
        name: 'reenterNewKeystorePassword',
        message: 'Re-enter the password to encrypt your account',
        validate: (input, answers) => new Promise((resolve, reject) => {
            if (input === answers.enterNewKeystorePassword) resolve(true);
            else reject(new Error('Password doesn\'t match'));
        }),
    },
    enterKeystorePassword: {
        type: 'password',
        name: 'enterKeystorePassword',
        message: 'Enter the account password',
    },
};
