// Instaloader Main

// dependencies
const _ = require('lodash');
const stats = require("stats-lite");
const promise = require('bluebird');
const request = promise.promisify(require('request'));

// constants
const MAX_POSTS = 100;
const MAX_DAYS_AGO = 30;
const MS_IN_AN_HOUR = 3.6E6;
const MS_IN_A_DAY = 8.64E7;
const MIN_DATE = new Date(new Date(Date.now()).getTime() - MAX_DAYS_AGO * MS_IN_A_DAY);

// helper methods below
const toProfileInfo = user => {
    return {
        userName: user.username,
        fullName: user.full_name,
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

const toPosts = nodes => {
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

const dmyArr = (inc, max) => {
    var s = [], c = 0;
    while (c < max) {
        s.push(c);
        c += inc;
    }
    return s;
};

const errHdl = err => { console.error(err.toString()); };

// desired profile (temp)
const inputProfile = 'neymarjr';

// globals
var profileInfo = {};
var posts;

// program begins here
var baseQry = {
    url: `https://www.instagram.com/${inputProfile}/`,
    method: 'GET',
    qs: { __a: 1 },
    timeout: 60000
};

return request(baseQry)

    .then(result => {

        var user = JSON.parse(result.body).user;

        profileInfo = toProfileInfo(user);
        posts = toPosts(user.media.nodes);
        if (!profileInfo || !posts) throw new Error('profile/posts could not be loaded');

        var inc = posts.length;
        var p = profileInfo.postCount - inc;
        var m = MAX_POSTS - inc;
        var max = m > p ? p : m;

        return promise.mapSeries(dmyArr(inc, max), promise.method(() => {

            if (posts.length >= MAX_POSTS || posts[posts.length - 1].date < MIN_DATE) return;

            baseQry.qs = { __a: 1, max_id: posts[posts.length - 1].id };

            return request(baseQry)
                .then(rec => {
                    posts = posts.concat(toPosts(JSON.parse(rec.body).user.media.nodes));
                })
                .catch(errHdl);

        }));

    })

    .then(() => {

        if (posts.length > MAX_POSTS) posts = posts.slice(0, MAX_POSTS);
        posts = _.sortBy(posts, 'date');

        var likes = _.map(posts, 'likeCount');
        var likes100 = likes.map(val => { return val * 100.0 / profileInfo.followersCount; });
        var comments = _.map(posts, 'commentCount');
        var comments100 = comments.map(val => { return val * 100.0 / profileInfo.followersCount; });

        var dts = [];
        posts.slice(1, posts.length - 1).forEach((post, i) => {
            console.log(posts[i].date.toISOString());
            dts.push((post.date.getTime() - posts[i].date.getTime()) / MS_IN_AN_HOUR);
        });

        var postStats = {

            totalSamples: posts.length,
            daysInterval: (posts[0].date.getTime() - posts[posts.length - 1].date.getTime()) / MS_IN_A_DAY,
            avgPostsPerWeek: Math.round(posts.length * MS_IN_A_DAY * 7.0 / (posts[0].date.getTime() - posts[posts.length - 1].date.getTime())),

            likesPerPost: {
                min: _.min(likes),
                q1: Math.round(stats.percentile(likes, 0.25)),
                median: Math.round(stats.median(likes)),
                mean: Math.round(_.mean(likes)),
                q3: Math.round(stats.percentile(likes, 0.75)),
                max: _.max(likes),
                stdev: Math.round(stats.stdev(likes)),
                iqr: Math.round(stats.percentile(likes, 0.75) - stats.percentile(likes, 0.25))
            },

            likesPerFollower: {
                min: _.min(likes100).toFixed(4),
                q1: stats.percentile(likes100, 0.25).toFixed(4),
                median: stats.median(likes100).toFixed(4),
                mean: _.mean(likes100).toFixed(4),
                q3: stats.percentile(likes100, 0.75).toFixed(4),
                max: _.max(likes100).toFixed(4),
                stdev: stats.stdev(likes100).toFixed(4),
                iqr: (stats.percentile(likes100, 0.75) - stats.percentile(likes100, 0.25)).toFixed(4)
            },

            commentsPerPost: {
                min: _.min(comments),
                q1: Math.round(stats.percentile(comments, 0.25)),
                median: Math.round(stats.median(comments)),
                mean: Math.round(_.mean(comments)),
                q3: Math.round(stats.percentile(comments, 0.75)),
                max: _.max(comments),
                stdev: Math.round(stats.stdev(comments)),
                iqr: Math.round(stats.percentile(comments, 0.75) - stats.percentile(comments, 0.25))
            },

            commentsPerFollower: {
                min: _.min(comments100).toFixed(4),
                q1: stats.percentile(comments100, 0.25).toFixed(4),
                median: stats.median(comments100).toFixed(4),
                mean: _.mean(comments100).toFixed(4),
                q3: stats.percentile(comments100, 0.75).toFixed(4),
                max: _.max(comments100).toFixed(4),
                stdev: stats.stdev(comments100).toFixed(4),
                iqr: (stats.percentile(comments100, 0.75) - stats.percentile(comments100, 0.25)).toFixed(4)
            },

            hoursBetweenPosts: {
                min: _.min(dts).toFixed(4),
                q1: stats.percentile(dts, 0.25).toFixed(4),
                median: stats.median(dts).toFixed(4),
                mean: _.mean(dts).toFixed(4),
                q3: stats.percentile(dts, 0.75).toFixed(4),
                max: _.max(dts).toFixed(4),
                stdev: stats.stdev(dts).toFixed(4),
                iqr: (stats.percentile(dts, 0.75) - stats.percentile(dts, 0.25)).toFixed(4)
            }

        };

        console.log(`\nPROFILE INFO: ${JSON.stringify(profileInfo, null, 4)}\n\nPOST STATS: ${JSON.stringify(postStats, null, 4)}\n`);

    })

    .catch(errHdl);
