/* eslint no-console: off */

module.exports = (app, web3js, config, ipfs) => {
    app.get('/echo', (req, res) => {
        res.send('ok');
        //console.log(`Config: ${JSON.stringify(config, null, 2)}`);
    });

    // Submit a certificate
    // userPubKey - user's public key
    app.put('/submit/:userPubKey', (req, res) => {
        
    });

    // Revoke a user's certificate
    // userAddress - user's ethereum address
    // certId - certificate id/hash
    app.put('/revoke/:userAddress/:certId', (req, res) => {

    });
};
