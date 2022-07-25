// A simple, functional work queue

module.exports = (func, concurrency) => {

    const tasks = [];
    const callbacks = new Set();

    const getNextTask = () => {
        
        // if there is work available, return it
        if(tasks.length > 0) {
            return tasks.shift();
        }
        
        // otherwise, save a callback for when work arrives
        return new Promise(resolve => {
            callbacks.add(resolve);
        });
        
    };

    const spawnWorker = async () => {
        while(true) {
            const task = await getNextTask();
            try {
                task.resolve(func(...task.args));
            } catch(err) {
                task.reject(err);
            }
        }
    };

    // spawn workers
    for(let i = 0; i < concurrency; i++) {
        spawnWorker();
    }

    // return fn to enqueue things
    return (...args) => new Promise((resolve, reject) => {

        const task = {resolve, reject, args};

        // if there is a worker waiting for work, immediately start the task
        if(callbacks.size > 0) {
            const callback = callbacks.values().next().value;
            callbacks.delete(callback);
            callback(task);
        } else {
            // otherwise, queue it up
            tasks.push(task);
        }

    });

};