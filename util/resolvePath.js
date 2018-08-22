const path = require('path');
const os = require('os');

const home = os.homedir();

module.exports = (input) => {
    if (typeof input !== 'string') {
        throw new TypeError(`Expected a string, got ${typeof input}`);
    }

    // First, replace tilda with abs home path
    const tildaReplaced = home ? input.replace(/^~(?=$|\/|\\)/, home) : input;

    // Second, replace any possible relative path references like `..` or `.`
    const absPath = path.resolve(tildaReplaced);

    return absPath;
};
