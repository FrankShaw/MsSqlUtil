const debug = require('debug')('ms-sql-util');
const mssql = require('mssql');
const Promise = require('bluebird');

const state = {
    pools: {},
    connections: {},
    configurations: {},
    aliases: {}
};

const connections = {
    add: addConnection,
    get: getConnection
};

function addConnection(config) {
    const name = _getName(config);
    const alias = _getAlias(config);

    debug(`Creating connection: ${name}`);

    if (name !== alias && !state.aliases[alias]) {
        state.aliases[alias] = name;
    }
    if (config.host) {
        config.server = config.host;
    }

    return _connect(name, config);
}

function getConnection(config) {
    let name = _getName(config);
    const aliasedName = state.aliases[name];
    name = aliasedName || name;
    const connection = state.connections[name];
    if (!connection) {
        throw new Error(`Connection with name "${name}" does not exist.`);
    }
    return connection;
}

function _connect(name, config) {
    debug(`Connecting to ${config.server}`);
    const pool = new mssql.Connection(config);

    pool.on('close', function() {
        debug(`Connection "${name}" closed.`);
        debug('Removing connection from the application.')
        pool.removeAllListeners();
        delete state.connections[name];
        delete state.pools[name];
    });

    pool.on('error', function (error) {
        debug(`Error on connection: "${name}"`, error);
        pool.removeAllListeners();
        delete state.connections[name];
        delete state.pools[name];
    });

    state.pools[name] = pool;
    return new Promise(function (resolve, reject) {
        pool.connect().then(function () {
            debug(`Connection (${name}) made to "${config.server}"`);
            state.connections[name] = pool;
            resolve(pool);
        }, function (error) {
            debug(`Error creating connection to server ${config.server}`, error);
            pool.removeAllListeners();
            delete state.connections[name];
            delete state.pools[name];
            reject(error);
        });
    });
}

function _getName(config) {
    if (config == null) {
        return 'default';
    } else if (typeof config === 'string') {
        return config;
    } else if (config.name) {
        return config.name;
    } else {
        if (_getConfiguration('default')) {
            return _getAlias(config)
        } else {
            return 'default';
        }
    }
}

function _getConfiguration(name) {
    return state.configurations[name];
}

function _getAlias(config) {
    return [config.host || config.server, config.user, config.database, config.domain, config.port].join('-');
}

module.exports = connections;