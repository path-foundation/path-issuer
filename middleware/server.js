/* eslint no-console: off */

const http = require('http');

// Starting the service
class Server {
    constructor(app, port, logger) {
        const onError = (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
            const bind = `Port ${port}`;
            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    logger.error(`${bind} requires elevated privileges`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    logger.error(`${bind} is already in use`);
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        };
        const onListening = () => {
            const bind = `port ${port}`;
            logger.info(`Listening on ${bind}`);
        };

        // Keep track of open connections
        const connections = [];
        const onConnection = (connection) => {
            connections.push(connection);
            connection.on('close', () => connections.splice(connections.indexOf(connection), 1));
        };

        let shutdownTimeoutHandler;
        const closeServer = (server) => new Promise((resolve, reject) => {
            try {
                server.close(() => {
                    logger.info('Closed out remaining server connections.');
                    resolve();
                });

                connections.forEach(curr => {
                    console.log('Closing a connection');
                    curr.end();
                });
                setTimeout(() => connections.forEach(curr => {
                    console.log('Destroying a connection that failed to close gracefully');
                    curr.destroy();
                }), 5000);
            } catch (err) {
                reject(err);
            }
        });
        const gracefulShutdown = (server) => () => {
            logger.info('Received kill signal, shutting down gracefully.');

            shutdownTimeoutHandler = setTimeout(() => {
                logger.warn('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10 * 1000);

            closeServer(server)
                .then(() => {
                    clearTimeout(shutdownTimeoutHandler);
                    logger.info('Shutting down the process...');
                    process.exit();
                }).catch((err) => {
                    logger.warn(`Error during shutdown: ${JSON.stringify(err, null, 2)}`);
                    process.exit(1);
                });
        };
        this.start = async () => {
            try {
                const server = http.createServer(app);
                server.listen(8080);
                //const server = app.listen(8080, app);
                server.on('error', onError);
                server.on('listening', onListening);
                server.on('connection', onConnection);
                // listen for TERM signal .e.g. kill
                process.on('SIGTERM', gracefulShutdown(server));
                // listen for INT signal e.g. Ctrl-C
                process.on('SIGINT', gracefulShutdown(server));
            } catch (error) {
                logger.error(`Failed to start the server: ${error}`);
            }
        };
    }
}

module.exports = Server;
