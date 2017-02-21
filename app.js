// app.js

const instaService = require('./insta.js');

const instaQry = {
    profile: 'vascodagama',
    digits: 4,
    maxDays: 90,
    maxPosts: 500,
    timeoutPerRequest: 60000
};

return instaService.measure(instaQry)
    .then(result => {
        if (result) console.log(`\n${JSON.stringify(result, null, 4)}\n`);
    });
