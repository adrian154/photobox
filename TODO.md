# Bugs

* Post information section persists even after the post is deleted if there are no more posts in collection
* ~~Filter doesn't affect slideshow~~

# TODO

* show whether collection is public/private/hidden on the homepage
* zoom in/out animation when clicking a post

* Delete an entire collection at once
* Select posts
    * Move posts between collections
* RAW processing pipeline
    * Read EXIF
    * Modify database schema to accomodate metadata
* User settings
    * Change loadrange
    * Manage 
* Clean up codebase
    * Better validation on API endpoints
* Prod issues
    * Why do large uploads keep timing out? (408)
    * Mitigate Slowloris
* Better video handling
    * Custom player with richer feature support
        * MediaMetadata
        * ~~thumbnails when hovering over progress bar~~
            * still need to generate these
        * ~~basic controls~~
            * ~~picture-in-picture~~
            * playback speed
            * ~~pick quality~~
            * ~~volume~~
            * ~~fullscreen~~
            * ~~scrub~~
    * Generate multiple resolutions?
        * original, 1080p, 720p, 480p, 360p
        * always transcode to H.264/AAC
    * Video editor
* Multi-user, storage limits 

## Inspirations

[PiGallery 2](https://bpatrik.github.io/pigallery2/)

[Damselfly](https://damselfly.info/)