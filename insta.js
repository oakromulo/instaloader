// Instaloader Main

// dependencies
const _ = require('lodash');
const stats = require("stats-lite");
const promise = require('bluebird');
const request = promise.promisify(require('request'));

// minor helpers
const errHdl = err => { console.error(err.toString()); };
const nowUtc = () => { return new Date(Date.now()).getTime(); };
const msBetweenDates = (d1, d2) => { return Math.abs(d1.getTime() - d2.getTime()); };

// decode instagram json user data
const toProfileInfo = user => {
    return {
        username: user.username,
        fullname: user.full_name,
        isVerified: user.is_verified,
        picUrl: user.profile_pic_url,
        picUrlHd: user.profile_pic_url_hd,
        biography: user.biography,
        isPrivate: user.is_private,
        postCount: user.media.count,
        followsCount: user.follows.count,
        followersCount: user.followed_by.count
    };
};

// decode instagram json media nodes
const nodesToPosts = nodes => {
    var postList = [];
    nodes.forEach(node => {
        postList.push({
            id: node.id,
            date: new Date(node.date * 1000),
            caption: node.caption,
            url: node.display_src,
            thumb: node.thumbnail_src,
            commentsEnabled: !node.comments_disabled,
            commentCount: node.comments_disabled ? null : (node.comments.count ? node.comments.count : null),
            likeCount: node.likes.count,
            isVideo: node.is_video,
            width: node.dimensions.width,
            height: node.dimensions.height
        });
    });
    return postList;
};

// helper to generate an evenly spaced array
const evenlyChunks = (inc, max) => {
    var s = [], c = 0;
    while (c < max) {
        s.push(c);
        c += inc;
    }
    return s;
};

// descriptive statistics function to be applied on certain fields of the array of json posts
const descStats = (arr, ndigits) => {

    const med = stats.median(arr);
    const q1 = stats.percentile(arr, 0.25);
    const q3 = stats.percentile(arr, 0.75);
    const iqr = q3 - q1;

    var objOut = {
        min: _.min(arr),
        linf: q1 - 1.5 * iqr,
        q1: q1,
        median: med,
        mean: _.mean(arr),
        q3: q3,
        lsup: q3 + 1.5 * iqr,
        max: _.max(arr),
        iqr: iqr,
        stdev: stats.stdev(arr),
        mad: stats.median(arr.map(val => { return Math.abs(val - med); }))
    };

    Object.keys(objOut).forEach(key => {
        if (ndigits > 0) objOut[key] = parseFloat(objOut[key].toFixed(ndigits));
        else objOut[key] = Math.round(objOut[key]);
    });

    return objOut;

};

// all "public" methods here
const instaService = {

    measure: params => {

        const msAgo = (params.maxDays ? params.maxDays : 30) * 8.64E7;
        const minDate = new Date(nowUtc() - msAgo);
        const maxPosts = params.maxPosts ? params.maxPosts : 100;
        const digits = params.digits ? params.digits : 4;

        var posts;
        var profileInfo = {};

        var baseQry = {
            url: `https://www.instagram.com/${params.profile ? params.profile : 'neymarjr'}`,
            method: 'GET',
            qs: { __a: 1 },
            timeout: params.timeoutPerRequest ? params.timeoutPerRequest : 30000
        };

        return request(baseQry)

            .then(result => {

                const user = JSON.parse(result.body).user;

                profileInfo = toProfileInfo(user);
                posts = nodesToPosts(user.media.nodes);
                if (!profileInfo || !posts) throw new Error('profile/posts could not be loaded');

                const inc = posts.length;
                const p = profileInfo.postCount - inc;
                const m = maxPosts - inc;
                const max = m > p ? p : m;

                return promise.mapSeries(evenlyChunks(inc, max), () => {

                    if (posts.length >= maxPosts|| posts[posts.length - 1].date < minDate) return;

                    baseQry.qs = { __a: 1, max_id: posts[posts.length - 1].id };

                    return request(baseQry)
                        .then(rec => {
                            posts = posts.concat(nodesToPosts(JSON.parse(rec.body).user.media.nodes));
                        })
                        .catch(errHdl);

                });

            })

            .then(() => {

                // sort post array by date
                posts = _.sortBy(posts, 'date');

                // remove any remaining posts after minDate or exceeding maxPosts
                for (var i = 0, len = posts.length; i < len; i++) {
                    if (posts[i].date > minDate) break;
                }
                posts = posts.slice(i, maxPosts);

                // generate array of hours between posts
                var dts = [];
                posts.slice(1, posts.length - 1).forEach((post, i) => {
                    dts.push((post.date.getTime() - posts[i].date.getTime()) / 3.6E6);
                });

                // calculate time intervals between the dates of the most recent and the latest posts
                const msInterval = msBetweenDates(posts[0].date, posts[posts.length - 1].date);
                const daysInterval = msInterval / 8.64E7;
                const weeksInterval = daysInterval / 7.0;

                // extract likes and comments from posts in absolute and relative numbers
                const likes = _.map(posts, 'likeCount');
                const likes100 = likes.map(val => { return val * 100.0 / profileInfo.followersCount; });
                const comments = _.map(posts, 'commentCount');
                const comments100 = comments.map(val => { return val * 100.0 / profileInfo.followersCount; });

                return {
                    profileInfo: profileInfo,
                    postStats: {
                        totalSamples: posts.length,
                        daysInterval: Math.round(daysInterval),
                        avgPostsPerWeek: Math.round(posts.length / weeksInterval),
                        avgLikesPerWeek: Math.round(_.sum(likes) / weeksInterval),
                        avgCommentsPerWeek:  Math.round(_.sum(comments) / weeksInterval),
                        likesPerPost: descStats(likes),
                        percentLikesPerFollower: descStats(likes100, 4),
                        commentsPerPost: descStats(comments),
                        percentCommentsPerFollower: descStats(comments100, 4),
                        hoursBetweenPosts: descStats(dts, 4)
                    }
                };

            })

            .catch(err => {
                errHdl(err);
                return null;
            });

    }

};

// all "public" methods are exported
module.exports = instaService;
