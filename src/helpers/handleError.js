import sleep from '../helpers/sleep.js';

const handleError = (error) => {
    switch (error.code) {
        case '5':
            console.log("Rate limit reached. Waiting 10 seconds...");
            sleep(10000);
            break;
        default:
            console.log("Unhandled Torn error: " + error.code);
            break;
    }
};

export default handleError;