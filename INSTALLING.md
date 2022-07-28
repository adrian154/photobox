# Installing Photobox

The easiest way to install Photobox is through Docker. An image is available on Docker Hub as [adrian154/photobox](https://hub.docker.com/r/adrian154/photobox). Here are some examples of how you might run Photobox using Docker:

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

## Standalone Installation
* Install [NodeJS](https://nodejs.org/en/download/)
* Clone this GitHub repo: `git clone https://github.com/adrian154/photobox.git`
* Run `npm install` in the project root
* Start the app with `node index.js` when ready

# Configuration

Photobox requires a configuration file called `config.json` to be present. A ready-to-use example is available at [config-example.json](https://github.com/adrian154/photobox/blob/master/config-example.json); simply rename this file to `config.json` and you're up and running.

*Note:* Recently, some major changes were made to the config file structure, so the out-of-date documentation has been removed. For now, refer to config-example.json; most of the fields should be self-explanatory.

You don't need to provide configuration for any storage engines, but the field must exist and contain a valid object.

# Adding Users

For now, users are added using the [configure.js](https://github.com/adrian154/photobox/blob/master/configure.js) tool. To add a user:

`node configure.js adduser <username> <password>`

To remove a user:

`node configure.js deluser <username>`

All users have full access to all collections and posts. Anonymous users cannot view any collections or posts.

# HTTPS

Photobox doesn't manage TLS. If you want to use it with HTTPS (which is strongly recommended) you'll have to use a reverse proxy like Nginx. When reverse proxied behind Nginx, I recommend setting the following properties:

```
client_max_body_size 0;
proxy_request_buffering off;
```

This lets Photobox manage upload size limits, but more importantly, it prevents the file from being buffered in memory or saved to a temporary file before being passed to Photobox.