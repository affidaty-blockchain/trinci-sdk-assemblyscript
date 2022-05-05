const t2lib = require("@affidaty/t2-lib");

/**
 * 
 * @param {"post" | "POST" | "get" | "GET"} method
 * @param {string} url
 * @param {string | Buffer | Uint8Array | ArrayBuffer | undefined} body
 * @param {{[key: string]: any} | undefined} customHeaders
 * @returns {Promise<ArrayBuffer>}
 */
function sendRequest(method, url, body, customHeaders) {
    return new Promise((resolve, reject) => {
        t2lib.Client.sendRequest(method, url, body ? new Uint8Array(Buffer.from(body)) : body, customHeaders)
            .then((response) => {
                response.arrayBuffer()
                    .then((arrayBuffer) => {
                        return resolve(arrayBuffer);
                    })
                    .catch((error) => {
                        return reject(error);
                    });
            })
            .catch((error) => {
                return reject(error);
            })
    });
}

function preAuth(url) {
    return new Promise((resolve, reject) => {
        sendRequest("POST", url, undefined, {"Content-Type": "application/json"})
            .then((response) => {
                return resolve(JSON.parse(Buffer.from(response).toString()).preAuth);
            })
            .catch((error) => {
                return reject(error);
            })
    });
}

/**
 * 
 * @param {string} url
 * @param {string} preAuth
 * @param {t2lib.Account} account
 * @returns 
 */

function sign(url, preAuth, account) {
    return new Promise((resolve, reject) => {
        t2lib.signData(
            account.keyPair.privateKey,
            new Uint8Array(Buffer.from(`authin#${preAuth}`)),
        )
            .then((signatureBytes) => {
                const signatureString = t2lib.binConversions.arrayBufferToBase58(signatureBytes.buffer);
                account.keyPair.publicKey.getRaw()
                    .then(async(pubKeyBytes) => {
                        const pubkeyString = t2lib.binConversions.arrayBufferToBase58(pubKeyBytes.buffer);
                        const jwt = {
                            preAuth,
                            pubKey: pubkeyString,
                            signature: signatureString,
                        }
                        sendRequest("POST", url, JSON.stringify(jwt), {"Content-Type": "application/json"})
                            .then((response) => {
                                const respObj = JSON.parse(Buffer.from(response).toString())
                                const authHeader = {
                                    Authorization: `Bearer ${respObj.authIn}`,
                                };
                                return resolve(authHeader);
                            })
                            .catch((error) => {
                                return reject(error);
                            })
                    })
                    .catch((error) => {
                        return reject(error);
                    });
            })
            .catch((error) => {
                return reject(error);
            });
    });
}

function signIn(preAuthUrl, signUrl, Account) {
    return new Promise((resolve, reject) => {
        preAuth(preAuthUrl)
            .then((preAuthString) => {
                sign(signUrl, preAuthString, Account)
                    .then((authHeader) => {
                        return resolve(authHeader);
                    })
                    .catch((error) => {
                        return reject(error);
                    });
            })
            .catch((error) => {
                return reject(error);
            })
    });
}

/**
 * 
 * @param {string} url 
 * @param {Buffer} archiveBytes 
 * @param {{[key: string]: any}} autHeader 
 * @returns 
 */
function submitForPreapproval(url, archiveBytes, authHeader) {
    return new Promise((resolve, reject) => {
        sendRequest("POST", url, archiveBytes, authHeader)
            .then((response) => {
                return resolve(response);
            })
            .catch((error) => {
                return reject(error);
            })
    });
}

module.exports = {
    signIn,
    submitForPreapproval,
}
