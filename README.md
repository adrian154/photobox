![logo](photobox-logo-black.png)

Photobox is a self-hosted image gallery I made for personal use. Check out the [installation guide](INSTALLING.md).

**This project is not completed yet, come back later.**

# TODO
* Finish new pipeline
* Make storage engines simply store/delete by filename, they don't need access to the whole versions object
    * That logic should be handled in the upload route

* Photography-specific features
    * Read EXIF/IPTC metadata
    * Support RAW upload
    * Show image meta somewhere on the webpage
    * Calendar view (like Flickr camera roll)
* Implement photo search
* Add deletion to storage engines
* Authentication scheme
    * OIDC
    * LDAP
* Albums, maybe? (between collections)
* Documentation for the API