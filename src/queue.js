// shitty work queue

module.exports = class {

    constructor(fn, concurrency) {
        this.tasks = [];
        this.callbacks = [];
        this.fn = fn;
        for(let i = 0; i < concurrency; i++) {
            this.spawnWorker();
        }
    }

    enqueue(params) {
        return new Promise((resolve, reject) => {
           
            const task = {data: params, resolve, reject};

            // check if there's a worker waiting to receive a task
            if(this.callbacks.length > 0) {
                this.callbacks.pop()(task);
            } else {
                // otherwise, add to the queue
                this.tasks.push(task);
            }

        });
    }

    async spawnWorker() {
        while(true) {
            const task = await this.nextTask();
            try {
                task.resolve(await this.fn(task.data));
            } catch(error) {
                task.reject(error);
            }
        }
    }

    nextTask() {
        
        // if there's a task immediately available, return it
        if(this.tasks.length > 0) {
            return this.tasks.shift();
        }

        // otherwise, wait until a task is enqueued
        let callback;
        const promise = new Promise(resolve => callback = resolve);
        this.callbacks.push(callback);
        return promise;

    }

};