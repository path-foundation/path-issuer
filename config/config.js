/* eslint global-require: off, import/no-dynamic-require: off */

const parseUri = require('../util/parseUri');

const config = {
    private: require('./private.json'),
    ropsten: require('./ropsten.json'),
};

module.exports = (params) => {
    const { network, infuraApiKey } = params;
    const conf = config[network];

    // IPFS stuff
    const uri = parseUri(conf.ipfsGateway);
    delete conf.ipfsGateway;

    conf.ipfs = {
        protocol: uri.protocol,
        host: uri.host,
        port: uri.port,
    };

    // ETH node stuff
    conf.eth = {
        rpcUrl: (conf.isInfura ? `${conf.nodeRpcUrl}/${infuraApiKey}` : conf.nodeRpcUrl),
    };

    return conf;
};
