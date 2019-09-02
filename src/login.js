/* global generator:false Generator:false */
const RedditAPI = require('reddit-wrapper-v2');
const aes256 = require('aes256');
const wait = require('wait-for-stuff');

let AESKEY = require('crypto').randomBytes(64).toString('hex');

/* Login page: show an error message */
function showLoginError(msg, id) {
    let label = document.getElementById(id || 'login-error');
    label.innerHTML = msg;
}

/* Login page: hide error message */
function hideLoginError(id) {
    let label = document.getElementById(id || 'login-error');
    label.innerHTML = '';
}

/* Encrypt login object */
function encryptLogin(loginObj) {
    let newObj = {};
    for (let key of Object.keys(loginObj))
        newObj[key] = aes256.encrypt(AESKEY || ' ', loginObj[key] || ' '); // No 0-length strings
    return newObj;
}

/* Decrypt login object */
function decryptLogin(loginObj) {
    let newObj = {};
    for (let key of Object.keys(loginObj))
        newObj[key] = aes256.decrypt(AESKEY || ' ', loginObj[key] || ' '); // No 0-length strings
    return newObj;
}

/* Atempt to generate connection obj */
function createGeneratorConnection(id) {
    if (generator.connection !== undefined) return true;

    let success = null;
    generator.connection = new RedditAPI({ ...Generator.DEFAULT_CONNECTION_SETTINGS, ...decryptLogin(generator.settings.login) });
    generator.connection.api.get('/api/v1/me/karma', {})  // Test login by getting karma
        .then(() => { success = true; })
        .catch(() => {
            showLoginError('Login failed, check your login details.', id);
            success = false;
        });

    /* Syncify this function by waiting for success */
    wait.for.predicate(() => success !== null);
    return success;
}

module.exports = {
    /* 
    * Attempts to construct the connection wrapper for accessing reddit API
    * Used during the login screen
    */
    attemptToConstructConnectionWrapper: () => {
        if (generator.settings.AESKEY) AESKEY = generator.settings.AESKEY;
        let success = createGeneratorConnection();
        document.getElementById('login-loading-image').style.display = 'none'; // Remove loading gif

        /* 
         * Decide if to move onto:
         * 1. Encryption key setup (first time setup)
         * 2. Encryption key login (if user specified)
         * 3. Main page (no key specifed)
         */
        if (success) {
            document.getElementById('first-time-login').style.display = 'none';
            if (!generator.settings.AESKEYExists) // 1)
                document.getElementById('first-time-encryption').style.display = 'block';
            else if (!generator.settings.AESKEY) // 2)
                document.getElementById('not-first-time-encryption').style.display = 'block';
            else  // 3)
                document.getElementById('first-time-login').style.display = 'none';
        }

        return success;
    },

    doLoginWithEncryptionKey: () => {
        AESKEY = document.getElementById('login-encryption-key-2').value;
        let success = createGeneratorConnection('login-error-2');
        document.getElementById('login-loading-image-2').style.display = 'none'; // Remove loading gif

        /* Move to main page if login worked */
        if (success) document.getElementById('not-first-time-encryption').style.display = 'none';
        return success;
    },

    createGeneratorConnection: createGeneratorConnection,
    showLoginError: showLoginError,
    hideLoginError: hideLoginError,

    /* Verification function for app ID */
    verifyAppID: () => {
        let value = document.getElementById('login-app-id').value;
        if (value !== '' && value.length !== 14)
            showLoginError('App ID is a 14 character string');
        else
            hideLoginError();
    },

    encryptLogin: encryptLogin,
    decryptLogin: decryptLogin,
    togglePasswordInput: (element, button) => {
        element.type = element.type === 'password' ? 'text' : 'password';
        button.innerText = button.innerText === 'Show' ? 'Hide' : 'Show';
    },

    /* Encryption key on change */
    encryptionOnChange: value => {
        let button = document.getElementById('encryption-button');
        button.innerText = value.length === 0 ? 'Generate key' : 'Use key';
    },

    submitEncryptionKey: () => {
        if (document.getElementById('login-encryption-key').value.length > 0) {
            /* Re-encrypt login details with new key */
            let temp = decryptLogin(generator.settings.login);
            AESKEY = document.getElementById('login-encryption-key').value;
            generator.settings.login = encryptLogin(temp);
            generator.settings.AESKEY = null;
        } else {
            /* Save the key if it's not given */
            generator.settings.AESKEY = AESKEY;
        }
        generator.settings.AESKEYExists = true;
        generator.saveSettings(true);

        /* Move to main meme page */
        document.getElementById('first-time-encryption').style.display = 'none';
    }
};
