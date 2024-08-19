function parseListHeaders(headers) {
    try {
        const parsedHeaders = {};

        Object.keys(headers).forEach((key) => {
            const lowerKey = key.toLowerCase().replace('list-', '');
            const headerValue = headers[key];
            let parsedValue;

            // Check if the header contains multiple values
            if (headerValue.includes(',')) {
                parsedValue = headerValue.split(',').map(value => parseHeaderValue(value));
            } else {
                parsedValue = parseHeaderValue(headerValue);
            }

            parsedHeaders[lowerKey] = parsedValue;
        });

        return {
            list: parsedHeaders
        }

    } catch(error) {
        return {
            error: error
        }
    }
}

function parseHeaderValue(value) {
    const mailtoPattern = /<mailto:(.+?)>/;
    const httpPattern = /<(https?:\/\/.+?)>/;
    const commentPattern = /\((.+?)\)/;

    let parsedValue = value.trim();
    const result = {};

    // Extract URL
    const mailtoMatch = value.match(mailtoPattern);
    const httpMatch = value.match(httpPattern);
    if (mailtoMatch) {
        parsedValue = mailtoMatch[1];
    } else if (httpMatch) {
        parsedValue = httpMatch[1];
    }

    // Extract comment
    const commentMatch = value.match(commentPattern);
    if (commentMatch) {
        result.url = parsedValue;
        result.comment = commentMatch[1];
        return result;
    }

    return parsedValue;
}

module.exports = {
    parseListHeaders
}