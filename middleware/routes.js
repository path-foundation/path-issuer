/* eslint no-console: off */
const {
    submitCertificate,
    revokeCertificate,
    getCertificateMetadata,
} = require('../controllers/certificateController');

module.exports = (app, web3, config, ipfs, logger) => {
    app.get('/echo', (req, res) => {
        res.send('ok');
    });

    app.get('/:userAddress/:certId', async (req, res) => {
        const { userAddress, certId } = req.params;

        try {
            const meta = await getCertificateMetadata(userAddress, certId, web3, config.addresses);
            res.send(JSON.stringify(meta));
        } catch (error) {
            logger.error(`Failed to retrieve certificate metadata for ${userAddress}/${certId}: ${error}`);
            res.status(500).send(error);
        }
    });

    /**
     * @description Submit a certificate
     * @param userAddress user's address
     */
    app.put('/:userAddress', async (req, res) => {
        const { userAddress } = req.params;
        const cert = req.body;

        try {
            await submitCertificate(userAddress, cert, ipfs, web3, config.addresses);
            res.status(200).send('ok');
        } catch (error) {
            logger.error(`Failed to submit a certificate for ${userAddress}: ${error}`);
            res.status(500).send(error);
        }
    });

    // Revoke a user's certificate
    // userAddress - user's ethereum address
    // certId - certificate id/hash
    /**
     * @description Revoke a user's certificate
     * @param userAddress user's ethereum address
     * @param certId certificate id/hash
     */
    app.delete('/:userAddress/:certId', async (req, res) => {
        const { userAddress, certId } = req.params;
        try {
            await revokeCertificate(userAddress, certId, web3, config.addresses);
            res.status(200).send('ok');
        } catch (error) {
            logger.error(`Failed to revoke certificate ${certId} for user ${userAddress}: ${error}`);
            res.status(500).send(error);
        }
    });
};
