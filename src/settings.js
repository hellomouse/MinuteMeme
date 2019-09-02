/* global generator:false Snackbar:false */
const electronSettings = require('electron-settings');
const login = require('./login.js');

const TOTAL_SETTING_TABS = 4;

/* Helper functions for loading settings */
function loadCheckbox(id, key) {
    /* By default checkboxes are checked, so we click on them
     * to uncheck them during load. The clicking is required
     * since CSS animation depends on click event and not just
     * a checked attribute. The click will also invert whatever
     * the original value was (which we do not want) so we set
     * the value to true before it's inverted */
    if (!generator.settings[key]) {
        generator.settings[key] = true;
        document.getElementById(id).click();
    }
}

function getCommunityIcon(sub) {
    return sub.community_icon || sub.icon_img || sub.header_img || './public/img/default-subreddit.png';
}

function generateSubredditSettingsHMTL(name, sub) {
    const idPrefix = `subreddit-${name}-`;
    const html = `
        <li id="${idPrefix}sub">
            <img src="${sub.image}" class="subreddit-image">${name}
            <span class="subreddit-remove" onclick="settings.removeSubreddit('${name}')">Remove</span>
            <br><br>

            <div class="subreddit-settings">
                <!--<label class="switch-light switch-material" id="${idPrefix}nsfw" onclick="${1}">
                    <input type="checkbox">Remove NSFW
                    <span class="toggle-edit"><span>Off</span><span>On</span><a></a></span>
                </label><br>-->
                Alternate Save Location
                <button class="button" style="float: right" onclick="document.getElementById('${idPrefix}file').click()">Select
                    folder</button>
                <input type="file" id="${idPrefix}file" style="opacity: 0; position: absolute; top: -99999px" webkitdirectory
                    onchange="${1}"></input>
                <br>
                <small style="color: #888" id="${idPrefix}save-dir">No save directory selected</small>
            </div>
        </li>`;
    return html;
}

function regenerateSubredditSettingList() {
    document.getElementById('settings-subreddit-list').innerHTML =
        Object.keys(generator.subreddits).sort().map(name =>
            generateSubredditSettingsHMTL(name, generator.subreddits[name])).join('\n');

    // Set all sliders to correct positions
}

module.exports = {
    setTab: tabId => {
        let tab, btn;
        for (let i = 1; i <= TOTAL_SETTING_TABS; i++) {
            tab = document.getElementById('settings-' + i);
            btn = document.getElementById('settings-btn-' + i);

            if (i === tabId) {
                tab.style.display = 'block';
                btn.classList.add('active');
            }
            else {
                tab.style.display = 'none';
                btn.classList.remove('active');
            }
        }
    },
    applyTheme: () => {
        generator.settings.darkTheme = !generator.settings.darkTheme;
        generator.settings.darkTheme ?
            document.body.setAttribute('data-theme', 'dark') : document.body.removeAttribute('data-theme');
        generator.saveSettings(true);
    },
    applyNSFW: type => {
        generator.settings.nsfw = type;
        generator.saveSettings(true);
    },
    applyImageClick: type => {
        generator.settings.openImageBehaviour = type;
        generator.saveSettings(true);
    },
    applySaveDir: dir => {
        generator.settings.saveDirectory = dir;
        document.getElementById('settings-save-dir-label').innerHTML = dir;
        generator.saveSettings(true);
    },
    applySaveFavoriteToSeperateFolder: () => {
        generator.settings.copyFavorites = !generator.settings.copyFavorites;
        generator.saveSettings(true);
    },
    applyMaxPostAge: value => {
        generator.settings.maxPostAge = value;
        generator.saveSettings(true);
    },
    applyRemoveLowRes: () => {
        generator.settings.removeLowRes = !generator.settings.removeLowRes;
        generator.saveSettings(true);
    },
    applyAllowSpoilers: () => {
        generator.settings.allowSpoilers = !generator.settings.allowSpoilers;
        generator.saveSettings(true);
    },
    applyMaxPostsPerSubReddit: value => {
        generator.settings.maxPostsPerSubreddit = value;
        generator.saveSettings(true);
    },
    applyDefaultBrowser: value => {
        generator.settings.defaultBrowser = value;
        generator.saveSettings(true);
    },
    addSubredditsFromProfile: () => {
        if (!generator.connection) return; // Not logged in yet
        generator.connection.api.get('/subreddits/mine/subscriber', { limit: 100 }).then(res => {
            // TODO error message
            if (res[0] !== 200) return; // Error of some sort
            let subs = res[1].data.children
                .filter(x => !x.data.display_name.startsWith('u_')) // Filter out users
                .map(x => x.data);

            for (let sub of subs) {
                let name = sub.display_name;
                if (generator.subreddits[name]) continue; // Already exists
                if (!sub.display_name) continue; // Invalid sub name

                generator.subreddits[name] = {
                    enabled: true,
                    saveLoc: '',
                    nsfw: true,
                    image: getCommunityIcon(sub)
                };
            }

            console.log(subs.map(x => x.display_name));

            regenerateSubredditSettingList();
            generator.saveSettings();
        });
    },
    addSubreddit: name => {
        generator.connection.api.get(`/r/${name}/about`).then(res => {
            // TODO error message
            if (res[0] !== 200) return; // Error of some sort
            if (generator.subreddits[name]) return; // Already exists
            if (!res[1].data.display_name) return; // Invalid sub name

            let data = res[1].data;
            generator.subreddits[name] = {
                enabled: true,
                saveLoc: '',
                nsfw: true,
                image: getCommunityIcon(data)
            };
            regenerateSubredditSettingList();
            generator.saveSettings();
        });
    },
    removeSubreddit: name => {
        let currentlyDeletedSubreddit = generator.subreddits[name];
        delete generator.subreddits[name];

        /* Undo snackbar */
        Snackbar.show({
            text: `Removed r/${name}`,
            width: '475px',
            pos: 'bottom-right',
            actionTextColor: '#ff0000',
            actionText: 'Undo',
            duration: 2000,
            onActionClick: element => {
                element.style.opacity = 0;  // Hide snackbar
                generator.subreddits[name] = currentlyDeletedSubreddit;
                regenerateSubredditSettingList();
                generator.saveSettings();
            }
        }); 

        document.getElementById(`subreddit-${name}-sub`).outerHTML = '';
        generator.saveSettings();
    },

    doLogin: (isFirstTime) => {
        /* Show the current progress bar */
        let loadingId = isFirstTime ? 'login-loading-image' : 'login-loading-image-2';
        document.getElementById(loadingId).src = './public/img/loading.gif';
        document.getElementById(loadingId).style.display = 'block';

        /* First time login function */
        if (isFirstTime) {
            generator.settings.login = login.encryptLogin({
                username: document.getElementById('login-username').value,
                password: document.getElementById('login-password').value,
                app_id: document.getElementById('login-app-id').value,
                api_secret: document.getElementById('login-app-secret').value
            });
            setTimeout(login.attemptToConstructConnectionWrapper, 50); // Allow loading image to process before actually logging in
        }
        /* Already logged in */
        else {
            setTimeout(login.doLoginWithEncryptionKey, 50); // Allow loading image to process before actually logging in
        }
    },

    resetLogin: () => {
        generator.settings.login = null;
        generator.connection = null;
        generator.settings.AESKEYExists = false;
        document.getElementById('not-first-time-encryption').style.display = 'none';
        document.getElementById('first-time-login').style.display = 'block';
        generator.saveSettings(true);
    },

    loadAllSettings: () => {
        /* Set all inputs to correct setting */
        let settings = generator.settings;

        /* User has custom encryption key */
        if (settings.login && settings.AESKEYExists && !settings.AESKEY) {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('loading-splash-page').style.display = 'none'; // Delete loading page
            document.getElementById('not-first-time-encryption').style.display = 'block'; // Make visible first-time-login
            return; // loadAllSettings() will be called when prompt is complete
        }

        /* User has not logged in yet, prompt the login button */
        else if (!settings.login || !login.attemptToConstructConnectionWrapper()) {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('loading-splash-page').style.display = 'none'; // Delete loading page
            document.getElementById('first-time-login').style.display = 'block'; // Make visible first-time-login
            return; // loadAllSettings() will be called when prompt is complete
        }

        let success = login.createGeneratorConnection(); // Create custom connection object
        if (!success) {  // Redo login, could not login
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('loading-splash-page').style.display = 'none'; // Delete loading page
            document.getElementById('not-first-time-encryption').style.display = 'block'; // Make visible first-time-login
            login.showLoginError('Could not login to reddit');
            return; // loadAllSettings() will be called when prompt is complete
        }

        document.getElementById('loading-splash-page').style.display = 'none'; // Delete loading page

        /* 1st page:
         * - Theme input
         * - NSFW setting
         * - Image onclick setting
         */
        if (!settings.darkTheme) {
            settings.darkTheme = true; // Toggle inverts this to false when clicked
            document.getElementById('settings-theme').click(); // Clicking reverses the theme
        }
        else document.body.setAttribute('data-theme', 'dark');

        document.getElementById('nsfw' + (['show', 'spoiler', 'hide'].indexOf(settings.nsfw) + 1)).click();
        document.getElementById('settings-image-click-' + (['url', 'enlarge'].indexOf(settings.openImageBehaviour) + 1)).click();

        /* 2nd page:
         * - Save directory
         * - Copy favorites to seperate folder
         * - Max post age
         * - Remove low res images
         * - Allow spoilers
         * - Max posts to load per subreddit
         */
        document.getElementById('settings-save-dir-label').innerHTML = settings.saveDirectory;
        loadCheckbox('settings-copy-favorites', 'copyFavorites');
        document.getElementById('settings-max-post-age').value = settings.maxPostAge;
        loadCheckbox('settings-remove-low-res', 'removeLowRes');
        loadCheckbox('settings-allow-spoilers', 'allowSpoilers');
        document.getElementById('settings-max-posts-per-sub').value = settings.maxPostsPerSubreddit;

        /* 3rd page:
         * - Subreddit list
         */
        regenerateSubredditSettingList();

        /* 4th page:
         * - Default browser
         */
        document.getElementById('settings-default-browser').value = settings.defaultBrowser;
    }
};