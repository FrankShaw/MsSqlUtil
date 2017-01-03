const connections = require('./connections');
const QueryContext = require('./request-context');

const MsSqlUtil = {
    addConnection: addConnection,
    getQueryContext: getQueryContext,
    execute: execute
};

function addConnection(config) {
    return connections.add(config);
}

function getQueryContext(config) {
    const connection = connections.get(config);
    return new QueryContext(connection);
}

function execute(connection, queryOptions) {
    if (arguments.length === 1) {
        queryOptions = connection;
        connection = undefined;
    }
    const sqlConnection = connections.get(connection);
    return new QueryContext(sqlConnection)
        .step('results', queryOptions)
        .query();
}

module.exports = MsSqlUtil;