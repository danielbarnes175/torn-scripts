import axios from 'axios';
import fs from 'fs';
import settings from '../../settings.json' assert { type: "json" };
import sleep from '../helpers/sleep.js';

async function getAllUsers() {
    const startingID = 1152536;
    const activeUsersTotal = 2500000;
    const currentTime = Date.now() / 1000;
    let mostRecentlyProcessedID = -1;
    let users = [];

    console.log(`Starting processing for ${activeUsersTotal} at ${currentTime}`)
    for (let i = startingID; i < activeUsersTotal; i++) {
        let user;
        try {
            await sleep(700);
            user = await getSingleUser(i);
        } catch (error) {
            console.log(`Error processing ${i}... Skipping user`)
            continue;
        }

        console.log(`Processing User: ${i}`);
        if (currentTime - user['last_action']['timestamp'] > (86400 * 60)) {
            console.log("Not active in last 2 months");
            continue;
        }

        users.push({
            name: user['name'],
            user_id: user['player_id']
        });
        console.log(`Processed and Added User: ${i}`);
        
        saveActiveUsers(users, startingID, i, mostRecentlyProcessedID);
        mostRecentlyProcessedID = i;
    }

    saveActiveUsers(users, startingID, activeUsersTotal, mostRecentlyProcessedID);
}

async function getSingleUser(userID) {
    let endpoint = `https://api.torn.com/user/${userID}?selections=profile&key=${settings.api_key}`;

    let user = await axios.get(endpoint);

    if (user.data.error) {
        console.log(user.data.error);
        throw new Error('Error getting request');
    }

    return user.data;
}

function saveActiveUsers(users, rangeMin, rangeMax, mostRecentlyProcessedID) {
    const currentFileName = `../reports/activeUsers-${rangeMin}-${rangeMax}.json`;
    const prevFileName = `../reports/activeUsers-${rangeMin}-${mostRecentlyProcessedID}.json`;

    fs.writeFile(currentFileName, JSON.stringify(users, null, 2), err => {
        if (err) throw err
    });

    fs.access(prevFileName, fs.F_OK, (err) => {
        fs.unlink(prevFileName, (err) => {});
    })
}

getAllUsers();