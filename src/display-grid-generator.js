const Subreddit = require('./subreddit.js');
const settings = require('electron-settings');

/**
 * @param {String} HTML representing a single element
 * @return {Element}
 */
function htmlToElement(html) {
    let template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}


/**
 * Generator for a display grid that
 * displays all the memes
 */
class DisplayGenerator {
    /**
     * Construct a new display generator
     */
    constructor() {
        // TODO load subreddit / settings here
        /* Settings
        each subreddit:
            nsfw
            save dir
            enabled
        nsfw: spoiler censor / dont / hide completely

        */
        /* Setting loading */
        this.settings = settings.get('settings', DisplayGenerator.DEFAULT_SETTINGS);
        // this.subreddits = {};
        //     'kemonomimi': {
        //         enabled: true,
        //         saveLoc: '',
        //         nsfw: true
        //     }
        // };
        this.subreddits = settings.get('subreddits', this.subreddits);

        /* HTML handling */
        this.posts = [];
        this.subredditClasses = Object.keys(this.subreddits).map(name => {
            let data = this.subreddits[name];
            let sub = new Subreddit(name, data.enabled, data.saveLoc, data.nsfw);
            sub.on('load', () => {
                this.posts = this.posts.concat(sub.posts);
            });
            return sub;
        });
    }

    /**
     * Generate HTML for the posts
     */
    generateHTML() {
        /* Optionally sort landscape art together (Experimental) */
        // this.posts.sort((a, b) => a.thumbnail_width / a.thumbnail_height > b.thumbnail_width / b.thumbnail_height ? -1 : 1);

        this.div = document.getElementById('memes');

        
        for (let post of this.posts)
            this.addPost(post);



        //for (let post of this.posts)
        //   document.getElementById('memes').innerHTML += DisplayGenerator.postToHTML(post);
    }

    /**
     * Adds a post to the memes html div
     * @param {Object} post Post to add 
     */
    addPost(post) {
        let elem = htmlToElement(DisplayGenerator.postToHTML(post));
        this.div.appendChild(elem);
    }

    /**
    * Convert a post to HTML
    * @param {object} post Post object
    */
    static postToHTML(post) {
        // TODO controls = 
        // save image
        // copy image
        // open reddit link onclick="openUrl('https://reddit.com${post.permalink}');"
        
        let flair = post.link_flair_css_class ?
            `<span class="flair" style="background-color: ${post.link_flair_background_color};
                color: ${post.link_flair_text_color === 'light' ? 'white': 'black'}">
                ${post.link_flair_text}</span>` : '';

        // ${post.thumbnail_width > post.thumbnail_height
        //      ? 'large-image' : ''}

        //class= post col

        return `
        <div class="post grid-item">
            <p class="title">
                ${post.title}<br>
                <small class="author-small">${post.author} ${flair}</small>
            </p> 
            <span onclick="openUrl('${post.url}')">${DisplayGenerator.getPostImage(post)}</span>
            <div class="background-image" 
                style="background-image: url(${post.thumbnail})"></div>
             <p class="controls">
                <button>COPY</button>
                <button>SAVE</button>
                <button>REDDIT</button>
                <button>IMAGE LINK</button>
            </p>
            </div>`;
    }

    /**
     * Extract the best url to the image from the post object
     * @param {object} post Post object
     */
    static getPostImage(post) {
        if (DisplayGenerator.IMAGE_EXT.some(ext => post.url.endsWith('.' + ext)))
            return DisplayGenerator.wrapImg(post.url);
        if (DisplayGenerator.VID_EXT.some(ext => post.url.endsWith('.' + ext)))
            return DisplayGenerator.wrapVid(post.url, post.thumbnail);
        if (post.media_metadata) {
            for (let key of Object.keys(post.media_metadata)) {
                if (post.media_metadata[key].e === 'Image')
                    return DisplayGenerator.wrapImg(post.media_metadata[key].s.u);
            }
        }
        if (post.media) {
            if (post.media.reddit_video)
                return DisplayGenerator.wrapVid(post.media.reddit_video.scrubber_media_url, post.thumbnail);
            if (post.media.oembed)
                return post.media.oembed.url ?
                    DisplayGenerator.wrapVid(post.media.oembed.url, post.thumbnail) :
                    DisplayGenerator.wrapImg(post.media.oembed.thumbnail_url);
        }
        return DisplayGenerator.wrapImg(post.thumbnail);
    }
    
    /**
     * Wrap a url with a <video> tag
     * @param {string} url Url to video
     * @param {string} thumbnail Thumbnail url
     */
    static wrapVid(url, thumbnail) {
        return `<video autoplay muted loop poster="${thumbnail}">
            <source src="${url.replace('gifv', 'mp4')}" type="video/mp4">
        </video>`;
    }

    /**
     * Wrap a url with a <img> tag
     * @param {string} url URL to image
     */
    static wrapImg(url) {
        return `<img src="${url}"></img>`;
    }

    /**
     * Save current settings to file
     * @param {boolean} settingsOnly Only save settings, not subreddits
     */
    saveSettings(settingsOnly = false) {
        settings.set('settings', this.settings);
        if (!settingsOnly) settings.set('subreddits', this.subreddits);
    }
}

DisplayGenerator.DEFAULT_SETTINGS = {
    darkTheme: false,
    saveDirectory: '',
    globalNsfw: false,
    nsfw: 'spoiler', // spoiler, show, hide,
    favorites: [],
    openImageBehaviour: 'url', // url or enlarge

    copyFavorites: false,
    maxPostAge: 2, // in days
    removeLowRes: true,
    allowSpoilers: false,
    maxPostsPerSubreddit: 30,

    defaultBrowser: 'chrome'
};
DisplayGenerator.IMAGE_EXT = ['png', 'jpg', 'jpeg', 'jif', 'gif', 'webp'];
DisplayGenerator.VID_EXT = ['mp4', 'mov', 'gifv'];
DisplayGenerator.DEFAULT_CONNECTION_SETTINGS = {
    user_agent: require('./subreddit.js').HEADERS['User-Agent'],
    retry_on_wait: true,
    retry_on_server_error: -1,
    retry_delay: 1,
    logs: true
};

module.exports = DisplayGenerator;