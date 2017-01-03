const mssql = require('mssql');

const PromiseQueue = require('./promise-queue');

/**
 * Creates a request context using a given database connection.
 * The user can add multiple steps to the query execution and
 *
 */
class RequestContext {

    /**
     * Create the request context
     * @param {mssql.Connection} connection - The database connection to use for this request.
     */
    constructor(connection) {
        this.promiseQueue = new PromiseQueue();
        this.connection = connection;
    }

    /**
     * Adds a new step to the request. Each step is added and executed in the order that it is
     * encountered during program run. Each step waits for the previous step to finish executing before
     * starting it's run. All steps run asynchronously utilizing a promise-enabled queue processor for
     * managing the execution of each query step.
     *
     * @param {string} alias - The alias for this query step. The alias is used to retrieve the results for
     * each step from the result object.
     * @param {function|Object} stepAction - The action for this step. Either a function, or a plain
     * configuration object can be passed as the step action. When using a function, the function will
     * accept two arguments. The first argument is the executor function. This function should be called at the end
     * of the processing and should be passed a configuration object as the query config. The second argument passed
     * is the current result set. This result set will contained aliased results of all previously run query steps.
     *
     * @returns {RequestContext} Returns this instance so this can act as a queue builder.
     */
    step(alias, stepAction) {
        if (typeof stepAction === 'object') {
            const queryConfig = stepAction;
            stepAction = function (execute) {
                return execute(queryConfig);
            };
        }

        const queueAction = () => {
            return stepAction.call(this, _executeSql.bind(this), this.promiseQueue.result);
        };

        this.promiseQueue.add(alias, queueAction);

        return this;
    }

    /**
     * Starts the query process. Begins dequeueing and running all of the query steps defined for this context.
     *
     * @returns {Promise} A promise from the promise-enabled queue. This promise will resolve once all
     * promises have been run from the queue and will return the final aliased results object as its only parameter.
     * The promise will be rejected if an error is encountered anywhere in the query process, and that can be handled
     * by the caller by adding a .catch block to the end of the request context chain.
     */
    query() {
        return this.promiseQueue.start();
    }
}

function _isQueryFromFile(query) {
    return typeof query !== 'string' && !!query.then;

}

function _executeSql(queryConfig) {
    const request = new mssql.Request(this.connection);
    if (queryConfig.params) {
        Object.keys(queryConfig.params).forEach(function (key) {
            const param = queryConfig.params[key];
            if (typeof param !== 'object') {
                request.input(key, param);
            } else {
                if (param.type) {
                    request.input(key, param.type, param.value);
                } else {
                    request.input(key, param.value);
                }
            }
        });
    }

    const query = queryConfig.query;
    if (_isQueryFromFile(query)) {
        return query.then(function (queryString) {
            return request.query(queryString);
        });
    } else {
        return request.query(query);
    }
}

module.exports = RequestContext;