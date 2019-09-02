const request = require('request');
const EventEmitter = require('events');

/**
 * A representation of a subreddit. Contains
 * config for loading and save locations
 */
class Subreddit extends EventEmitter {
    /**
     * Construct a Subreddit
     * @param {string} name Name of subreddit, the part after the r/
     * @param {boolean} enabled Display memes from this subreddit?
     * @param {string} saveLoc Location to save, null for default (root/name)
     * @param {boolean} nsfw Display nsfw content?
     */
    constructor(name, enabled = true, saveLoc = null, nsfw = false) {
        super();
        this.name = name;
        this.enabled = enabled;
        this.saveLoc = saveLoc;
        this.nsfw = nsfw;
        this.posts = [];

        this.getPostData();
    }

    /**
     * Update post data for the subreddit object
     * @param {string} sort Method to sort, must be included in Subreddit.SORT_OPTIONS
     */
    async getPostData(sort = 'best') {
        if (!Subreddit.SORT_OPTIONS.includes(sort))
            throw new Error('Sort option \'' + sort + '\' is not valid');
        request({
            url: `${Subreddit.BASE_URL}${this.name}/${sort}.json?limit=100`,
            method: 'GET',
            headers: Subreddit.HEADERS
        }, (err, res, body) => {
            let json = JSON.parse(body);

            /* Error checking */
            if (err) throw err;
            if (json.error) throw new Error(`Error: ${json.error} (${json.message}) | Reason: ${json.reason}`);
            if (json.kind !== 'Listing') throw new Error('JSON is not a listing type');

            this.posts = json.data.children.map(x => x.data);
            this.posts = this.posts.filter(Subreddit.containsMedia);
            this.emit('load');
        });
    }

    /**
     * Check if a post contains media (video or image or url)
     * @param {object} post Post from the JSON data
     */
    static containsMedia(post) {
        /* Some thumbnails can include "self" or non-image thumbnails */
        return post.is_video || post.media || post.thumbnail.includes('http');
    }
}

Subreddit.BASE_URL = 'https://www.reddit.com/r/';
Subreddit.SORT_OPTIONS = ['best', 'hot', 'new', 'rising', 'top', 'controversial'];
Subreddit.HEADERS = {
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
    'User-Agent': 'https://github.com/hellomouse/MinuteMeme'
};

module.exports = Subreddit;