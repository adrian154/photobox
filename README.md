![logo](photobox-logo-black.png)

Photobox is a self-hosted media organizer that I made for my personal use

**THIS PROJECT IS NOT COMPLETE, COME BACK LATER.**

# Deploying

To run Photobox, just install [NodeJS](https://nodejs.org/en/download/) and start the app with `node index.js`. A Docker image is available at [Docker Hub](https://hub.docker.com/r/adrian154/photobox).

Photobox doesn't manage TLS, if you want to use it with HTTPS (highly recommended) you'll have to use a reverse proxy like nginx.

When reverse proxied behind nginx, I recommend setting the following properties:

```
client_max_body_size 0;
proxy_request_buffering off;
```

This lets Photobox manage upload size limits, but more importantly, it prevents the file from being buffered in memory or (worse) saved to a temporary file before being passed to Photobox. This technically makes the server more vulnerable to Slowloris attacks, but since only authorized users can upload, it's not really a problem.

# TODO
* Slideshow
    * Handle video content
    * Content background: dominant color or blurred image?
    * Big problem: uploaded photos are just appended to the end of the photogrid, causing desync w/ the slideshow
        * Ugh, it's 2AM...
* Photogrid
    * Debounce onresize handler
    * Add sorting
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