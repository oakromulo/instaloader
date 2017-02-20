const _ = require('lodash');
const fs = require('fs');

var ext = JSON.parse(fs.readFileSync('ext.json'));
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
