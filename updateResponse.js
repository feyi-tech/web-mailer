const crypto = require('crypto');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

dotenv.config();

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_S3_ENDPOINT, // Cloudflare R2 endpoint
    credentials: {
        accessKeyId: process.env.R2_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_S3_SECRET_ACCESS_KEY,
    }
});

const hashString = (str) => {
    return crypto.createHash('sha256').update(str).digest('hex');
};

const fetchJsonFile = async (hash) => {
    const params = {
        Bucket: process.env.R2_BUCKET,
        Key: `web-mailer/${hash}.json`
    };

    try {
        const command = new GetObjectCommand(params);
        const data = await s3Client.send(command);
        const stream = data.Body;
        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return {}; // Return an empty object if file doesn't exist
        } else {
            throw new Error('Error fetching JSON file: ' + error.message);
        }
    }
};

const updateJsonFile = async (hash, updatedContent) => {
    const params = {
        Bucket: process.env.R2_BUCKET,
        Key: `web-mailer/${hash}.json`,
        Body: JSON.stringify(updatedContent),
        ContentType: 'application/json'
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
    } catch (error) {
        throw new Error('Error updating JSON file: ' + error.message);
    }
};

const updateResponse = (from, title, body, successfullMails, failedMails, replyTo, emailHeaders, isRetry) => {
    return new Promise(async (resolve, reject) => {
        try {
            const concatenatedString = `${from.toLowerCase()}${title.toLowerCase()}`;
            const hash = hashString(concatenatedString);
    
            let jsonContent = await fetchJsonFile(hash);
    
            // Update the JSON content
            jsonContent.from = from;
            jsonContent.replyTo = replyTo;
            jsonContent.emailHeaders = emailHeaders;
            jsonContent.title = title;
            jsonContent.body = body;
    
            if (!jsonContent.successfullMails) jsonContent.successfullMails = [];
            if (!jsonContent.failedMails) jsonContent.failedMails = [];
    
            jsonContent.successfullMails = [...jsonContent.successfullMails, ...successfullMails];
            if(!isRetry) {
                jsonContent.failedMails = [...jsonContent.failedMails, ...failedMails];

            } else {
                const successfullRecipients = successfullMails.map(mail => mail.to)
                //Remove the successfull ones from the list
                jsonContent.failedMails = jsonContent.failedMails.filter(recipient => !successfullRecipients.includes(recipient.to));
            }
    
            await updateJsonFile(hash, jsonContent);

            resolve({
                link: `https://r2.softbaker.com/web-mailer/${hash}.json?t=${Date.now()}`,
                successfullMails: jsonContent.successfullMails,
                failedMails: jsonContent.failedMails
            })
            
        } catch (error) {
            reject(error)
        }
    })
};

module.exports = updateResponse;