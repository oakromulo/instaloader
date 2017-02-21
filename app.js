//const fs = require('fs');
const _ = require('lodash');
const promise = require('bluebird');
const request = promise.promisify(require('request'));

//var ext = JSON.parse(fs.readFileSync('ext.json'));

const user = 'neymarjr';

var initialQry = {
    url: `https://www.instagram.com/${user}/`,
    method: 'GET',
    qs: { __a: 1 },
    timeout: 60000
};

var profileInfo = {};

var posts = [];

return request(initialQry)
    .then(result => {
        var obj = JSON.parse(result.body).user;
        profileInfo = {
            userName: obj.username,
            fullName: obj.full_name,
            isVerified: obj.is_verified,
            picUrl: obj.profile_pic_url,
            picUrlHd: obj.profile_pic_url_hd,
            biography: obj.biography,
            isPrivate: obj.is_private,
            postCount: obj.media.count,
            followsCount: obj.follows.count,
            followersCount: obj.followed_by.count
        };
        obj.media.nodes.forEach(node => {
            posts.push({
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
        console.log(JSON.stringify(profileInfo, null, 4));
        console.log(JSON.stringify(posts, null, 4));
    })
    .catch(err => {
        console.error(err.toString());
    });

/*
var name = ext.entry_data.ProfilePage[0].user.username;
var likes = _.map(ext.entry_data.ProfilePage[0].user.media.nodes, 'likes.count');
var media_count = ext.entry_data.ProfilePage[0].user.media.count;
var is_verified = ext.entry_data.ProfilePage[0].user.is_verified;
var comments = _.map(ext.entry_data.ProfilePage[0].user.media.nodes, 'comments.count');
var followers = ext.entry_data.ProfilePage[0].user.followed_by.count;
var engagement_likes = _.sum(likes) * 100 / likes.length / followers;
var engagement_comments = _.sum(comments) * 100 / comments.length / followers;

console.log(`\n${name.toUpperCase()}`);
console.log(`Verified: ${is_verified ? 1 : 0}`);
console.log(`Total posts: ${media_count}`);
console.log(`Followers: ${followers}`);
console.log(`Engagement likes: ${Math.round(engagement_likes * 10000)}`);
console.log(`Engagement comments: ${Math.round(engagement_comments * 10000)}\n`);
*/
