![logo](photobox-logo-black.png)

Photobox is a self-hosted media organizer that I made for my personal use

**THIS PROJECT IS NOT COMPLETE, COME BACK LATER.**

# Deploying

Photobox requires [NodeJS](https://nodejs.org/en/download/) to run. After installing NodeJS, run `npm install` in the project root. You'll also need to set up the `config.json` file, which is structured like so:

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

Any amount of storage engines can be configured; here, the two supported types are shown for completeness. Depending on the amount of memory available, `processingConcurrency` can be increased to speed up processing.

The app can now be started with `node index.js`. A Docker image is available at [Docker Hub](https://hub.docker.com/r/adrian154/photobox). When using Docker, you'll probably want to create a bind mount for `/app/tmp`, or else all uploads will be buffered in memory.

Photobox doesn't manage TLS. If you want to use it with HTTPS (which is strongly recommended) you'll have to use a reverse proxy like Nginx. When reverse proxied behind Nginx, I recommend setting the following properties:

```
client_max_body_size 0;
proxy_request_buffering off;
```

This lets Photobox manage upload size limits, but more importantly, it prevents the file from being buffered in memory or (worse) saved to a temporary file before being passed to Photobox. This technically makes the server more vulnerable to Slowloris attacks, but since only authorized users can upload, it's not really a problem.

# TODO
* Post selection
    * Implement
* Post editor, add deletion to storage engines
* Scrolling slideshow on mobile