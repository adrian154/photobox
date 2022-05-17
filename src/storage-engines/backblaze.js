const storeToTempFile = require("../temp-storage.js");
const fetch = require("node-fetch");
const fs = require("fs");

// backblaze recommends 5 upload attempts
const UPLOAD_ATTEMPTS = 5;

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
    async uploadFile(stream, name, contentType) {
        
        // Backblaze's API demands to know the length of the file being uploaded beforehand
        // Therefore, we need to save the stream to yet another temporary file
        const {path, bytesWritten, hash, delete: deleteTemp} = await storeToTempFile(stream, true);

        for(let i = 0; i < UPLOAD_ATTEMPTS; i++) {

            const {uploadUrl, authorizationToken} = await this.getUploadURL();

            let response;
            try {

                const resp = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": authorizationToken,
                        "X-Bz-File-Name": encodeURIComponent(name),
                        "Content-Type": contentType,
                        "Content-Length": bytesWritten,
                        "X-Bz-Content-Sha1": hash.toString("hex")
                    },
                    body: fs.createReadStream(path)
                });

                response = await resp.json();
                if(!resp.ok) {
                    if(this.shouldReauth(response)) await this.refreshAuth();
                    continue;
                }

            } catch(error) {
                continue;
            }

            deleteTemp();
            return new URL(`/file/${this.config.bucket}/${response.fileName}`, this.downloadUrl).href;

        }

        deleteTemp();
        throw new Error("Failed to upload file after retrying");

    }

    async save(id, versions) {
        return {
            preview: await this.uploadFile(versions.preview.stream, `${id}-preview`, versions.preview.contentType),
            original: await this.uploadFile(versions.original.stream, `${id}-original`, versions.original.contentType),
            display: versions.display && await this.uploadFile(versions.display.stream, `${id}-display`, versions.display.contentType)
        };
    }

    /*
    async deleteFile(url) {

        const fileName = url.split('/').pop();

        const resp = await fetch(this.url("b2_delete_file_version"), {
            headers: {"Authorization": this.authToken, "Content-Type": "application/json"},
            body: JSON.stringify({
                fileName, 
            })
        })

    }
    */

    delete(object) {
        throw new Error("Deletion not implemented yet");
    }

};