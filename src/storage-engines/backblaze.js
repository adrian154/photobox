const fsPromises = require("fs/promises");
const {PassThrough} = require("stream");
const fetch = require("node-fetch");
const crypto = require("crypto");
const fs = require("fs");

// backblaze recommends 5 upload attempts
const UPLOAD_ATTEMPTS = 5;

// a custom stream that calculates SHA-1 hash
class UploadStream extends PassThrough {

    constructor(options) {
        super(options);
        this.hash = crypto.createHash("sha1");
    }
    
    _transform(chunk, encoding, callback) {
        this.hash.update(chunk);
        super._transform(chunk, encoding, callback);
    }

    _flush(callback) {
        this.push(this.hash.digest("hex"));
        callback();
    }

}

module.exports = class {

    constructor(config) {
        this.config = config;
        this.refreshAuth();
    }

    async refreshAuth() {

        const resp = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: {
                "Authorization": "Basic " + Buffer.from(`${this.config.keyID}:${this.config.key}`).toString("base64")}
        });

        if(!resp.ok) throw new Error((await resp.json()).code);
        const response = await resp.json();
        this.authToken = response.authorizationToken;
        this.apiUrl = response.apiUrl;
        this.downloadUrl = response.downloadUrl;

    }

    // check if a response indicates that we should reauth
    shouldReauth(response) { return response.code === "bad_auth_token" || response.code === "expired_auth_token"; }

    // get the url for API requests
    url(endpoint) { return new URL("/b2api/v2/" + endpoint, this.apiUrl).href; }

    async getUploadURL(secondTry) {
        
        const resp = await fetch(this.url("b2_get_upload_url"), {
            method: "POST",
            headers: {"Authorization": this.authToken, "Content-Type": "application/json"},
            body: JSON.stringify({bucketId: this.config.bucketID})
        });

        const response = await resp.json();
        if(!resp.ok) {
            if(this.shouldReauth(response) && !secondTry) {
                await this.refreshAuth();
                return this.getUploadURL(secondTry);
            }
            throw new Error(response.code);
        }

        return response;

    }

    // TODO: exponential backoff
    async uploadFile(path, name, contentType) {
        
        const readStream = fs.createReadStream(path);
        const uploadStream = new UploadStream();
        readStream.pipe(uploadStream);

        for(let i = 0; i < UPLOAD_ATTEMPTS; i++) {

            const {uploadUrl, authorizationToken} = await this.getUploadURL();

            try {

                const resp = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": authorizationToken,
                        "X-Bz-File-Name": encodeURIComponent(name),
                        "Content-Type": contentType,
                        "Content-Length": fs.statSync(path).size + 40,
                        "X-Bz-Content-Sha1": "hex_digits_at_end"
                    },
                    body: uploadStream
                });

                const response = await resp.json();
                if(!resp.ok) {
                    if(this.shouldReauth(response)) await this.refreshAuth();
                    continue;
                }

                return {
                    url: new URL(`/file/${this.config.bucket}/${response.fileName}`, this.downloadUrl).href,
                    fileName: response.fileName,
                    fileId: response.fileId
                }

            } catch(error) {
                continue;
            }

        }

        throw new Error("Failed to upload file after retrying");

    }

    async save(id, versions) {
        for(const versionName in versions) {
            const version = versions[versionName];
            if(!version) continue;
            const {url, fileName, fileId} = await this.uploadFile(version.path, `${id}-${versionName}`, version.contentType);
            version.url = url;
            version.fileName = fileName;
            version.fileId = fileId;
            await fsPromises.unlink(version.path);
            delete version.path;
        }
        return versions;
    }

    async delete(post) {
        for(const versionName in post.versions) {   

            const version = post.versions[versionName];
            const resp = await fetch(this.url("b2_delete_file_version"), {
                method: "POST",
                headers: {"Authorization": this.authToken, "Content-Type": "application/json"},
                body: JSON.stringify({fileId: version.fileId, fileName: version.fileName})
            });

            if(!resp.ok) {
                console.log(await resp.json());
                throw new Error("Deletion failed; post may be partially deleted");
            }

        } 
    }

};