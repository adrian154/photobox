# Databases

* **Collections**
    * name: string
    * storageEngine: string
        * May be null to indicate that the collection is unmanaged
        * Posts are added to unmanaged collections via collectors

* **Posts**
    * id: string
    * dateUploaded: int
    * thumbnailURL: string
    * primaryURL: string
    * originalURL: string
        * originalURL is only for archival purposes

* **PostTags**
    * postID: string, foreign key -> Posts.id
    * tag: string

* **Tags**
    * tag: string

# Collectors

* When to run?
    * when the collection is viewed, to ensure the user never sees stale content 

# Web Architecture

Two functionalities:
* Collection view
    * Upload
    * Delete
    * Tag
    * Select -> operation...
* Slideshow view
    * Each collection has its own feed
    * There are other feed sources with no backing collection