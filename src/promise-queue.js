const Promise = require('bluebird');

class PromiseQueue {

    constructor() {
        this.promises = [];
        this.result = {};

        this.onComplete = function() {};
        this.onError = function() {};
    }

    add(alias, promiseFn) {
        this.promises.push({
            alias: alias,
            promiseFn: promiseFn
        });
    }

    start() {
        process.nextTick(() => {
            this._dequeue();
        });

        return new Promise((resolve, reject) => {
            this.onComplete = resolve;
            this.onError = reject;
        });
    }

    _dequeue() {
        const currentPromise = this.promises.shift();

        Promise.try(currentPromise.promiseFn).then((result) => {
            this.result[currentPromise.alias] = result;
            if (this.promises.length === 0) {
                this.onComplete(this.result);
            } else {
                this._dequeue();
            }
        }).catch((error) => {
            this.promises = [];
            this.onError(error);
        });
    }
}

module.exports = PromiseQueue;