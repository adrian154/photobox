![logo](photobox-logo-black.png)

Photobox is a self-hosted media organizer that I made for my personal use

**THIS PROJECT IS NOT COMPLETE, COME BACK LATER.**

# Deploying

To run Photobox, just install [NodeJS](https://nodejs.org/en/download/) and start the app with `node index.js`. A Docker image is available at [Docker Hub](https://hub.docker.com/r/adrian154/photobox). When using Docker, you'll probably want to create a bind mount for `/app/tmp`, or else all uploads will be buffered in memory.

Photobox doesn't manage TLS. If you want to use it with HTTPS (which is strongly recommended) you'll have to use a reverse proxy like Nginx. When reverse proxied behind Nginx, I recommend setting the following properties:

```
client_max_body_size 0;
proxy_request_buffering off;
```

This lets Photobox manage upload size limits, but more importantly, it prevents the file from being buffered in memory or (worse) saved to a temporary file before being passed to Photobox. This technically makes the server more vulnerable to Slowloris attacks, but since only authorized users can upload, it's not really a problem.

# TODO
* Upload
    * Show a little icon at the bottom of the screen when an upload is in progress
    * Show ALL uploads in the upload tracker, even pending ones
    * Don't push uploads to the bottom when retried
    * Animate progress bar
    * Make upload order consistent
* Homepage
    * Add a way to view all collections on the homepage
    * Handle collection 404s gracefully (show error message)
* Backend
    * Fix horrible database code
    * Implement deletion
    * Implement Backblaze storage engine
    * (Maybe) Implement S3 storage engine
* Post selection
    * Implement