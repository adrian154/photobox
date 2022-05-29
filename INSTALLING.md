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

The bind mount for `/app/tmp` is not strictly necessary; you do not need it if you're okay with all temporary files being stored in memory.

Photobox can also be installed standalone; simply install [NodeJS](https://nodejs.org/en/download/), clone this Git repo, run `npm install` in the project root, and start the app with `node index.js` when ready.

# Configuration

Photobox requires a configuration file called `config.json` to be present. A ready-to-use example is available at [config-example.json](https://github.com/adrian154/photobox/blob/master/config-example.json).

Here is the full documentation of all fields in the configuration file.

* `port`: the port which Photobox will listen on. 
* `processingConcurrency`: how many uploads Photobox will attempt to process at once. If enough resources are available, you could increase this value to speed up processing.
* `storageEngines`: configuration for each individual storage backend. The object keys are the names of the storage engines, and the values are the configurations for each storage engines.
    * **Local Storage Engine**
        * `type`: `local`
        * `path`: the path where objects are stored
    * **Backblaze Storage Engine**
        * `type`: `backblaze`
        * `bucket`: the name of the bucket which objects will be uploaded to
        * `bucketID`: the bucket's ID
        * `keyID`: the application key's ID
        * `key`: the application key
* `imgurClientID`: OPTIONAL. The client ID of your Imgur application. Used to process Imgur posts when using Photobox as a Reddit viewer.

You don't need to provide configuration for any storage engines, but the field must exist and contain a valid object.

# HTTPS

Photobox doesn't manage TLS. If you want to use it with HTTPS (which is strongly recommended) you'll have to use a reverse proxy like Nginx. When reverse proxied behind Nginx, I recommend setting the following properties:

```
client_max_body_size 0;
proxy_request_buffering off;
```

This lets Photobox manage upload size limits, but more importantly, it prevents the file from being buffered in memory or saved to a temporary file before being passed to Photobox.