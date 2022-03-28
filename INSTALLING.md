# Installing Photobox

The easiest way to install Photobox is through Docker. An image is available on Docker Hub as [adrian154/photobox]([Docker Hub](https://hub.docker.com/r/adrian154/photobox)). Here are some examples of how you might run Photobox using Docker:

## Docker Command

```
docker run \
    --name photobox \
    -v /srv/photobox/data:/app/data \
    -v /srv/photobox/config.json:/app/config.json \
    -v /tmp/photobox:/app/tmp \
    -p 127.0.0.1:3006:80
```

## Docker Compose

```
photobox:
    image: adrian154/photobox
    volumes:
        - /srv/photobox/data:/app/data
        - /srv/photobox/config.json:/app/config.json
        - /tmp/photobox:/app/tmp
    ports:
        - "127.0.0.1:3006:80"
```

These configurations will bind to port 3006 on 127.0.0.1, so no remote connections will be able to access the site. This is because Photobox is intended to be used with a reverse proxy.

You don't necessarily have to create a bind mount for `/app/tmp`, but I strongly recommend doing so or else all uploads will be buffered in memory, potentially causing very high memory usage.

Photobox can be installed standalone through the following steps:

* Install [NodeJS](https://nodejs.org/en/download/).
* Clone the GitHub repo.
* Run `npm install` in the project root.
* Set up your configuration file (`config.json`) in the project root.
* The app can now be started with `node index.js`.

# Configuration

Photobox requires a configuration file, which looks like this:

```json
{
    "port": 80,
    "processingConcurrency": 1,
    "storageEngines": {
        "local": {
            "type": "local",
            "path": "data/objects"
        },
        "b2": {
            "type": "backblaze",            
            "bucket": "my-bucket",
            "bucketID": "REDACTED",
            "keyID": "REDACTED",
            "key": "REDACTED"
        }
    }
}
```

* `port`: the port which Photobox will listen on. 
* `processingConcurrency`: how many uploads Photobox will attempt to process at once. Depending on how many resources are available, you may want to increase this value to process uploads faster.
* `storageEngines`: configuration for each individual storage backend. The object keys are the names of the storage engines.
    * There are two supported storage engines: `local`, which saves files to a directory, and `b2`.
    * `local`:
        * `path`: the path where objects are stored
    * `b2`:
        * `bucket`: the name of the bucket which objects will be uploaded to
        * `bucketID`: the bucket's ID
        * `keyID`: the application key's ID
        * `key`: the application key

Any amount of storage engines can be configured; here, the two supported types are shown for completeness.

# HTTPS

Photobox doesn't manage TLS. If you want to use it with HTTPS (which is strongly recommended) you'll have to use a reverse proxy like Nginx. When reverse proxied behind Nginx, I recommend setting the following properties:

```
client_max_body_size 0;
proxy_request_buffering off;
```

This lets Photobox manage upload size limits, but more importantly, it prevents the file from being buffered in memory or saved to a temporary file before being passed to Photobox.