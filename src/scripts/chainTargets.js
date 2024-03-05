import axios from 'axios';
import settings from '../../settings.json' assert { type: "json" };
import sleep from '../helpers/sleep.js';

/**
 * Script to get targets recently attacked that are inactive and above the desired fair fight threshold.
 * Useful for keeping chain lists updated as you increase your stats.
 */
async function getChainTargets() {
    console.log(`************* STARTING SCRIPT *************`);
    const FAIR_FIGHT_THRESHOLD = 2.5;
    const DAYS_SINCE_LAST_ATTACK_THRESHOLD = 100;
    const DAYS_SINCE_LAST_ACTIVE_THRESHOLD = 2;
    let targets = {};
    let attacks = {};

    let body;
    const NUMBER_OF_ATTACK_PAGES = 5;
    console.log(`Parsing last ${NUMBER_OF_ATTACK_PAGES * 100} attacks...`)
    for (let i = 0; i < NUMBER_OF_ATTACK_PAGES; i++) {
        const attacksEndpoint = `https://api.torn.com/user/?selections=attacks,basic&from=${i * 100}&key=${settings.api_key}`;
        body = await axios.get(attacksEndpoint);
        const newAttacks = body.data.attacks;

        Object.assign(attacks, newAttacks);
    }

    for (let attackId in attacks) {
        if (attacks[attackId].defender_name === body.data.name || attacks[attackId].modifiers.fair_fight < FAIR_FIGHT_THRESHOLD) continue;

        let currentDate = new Date();
        const attackDate = new Date(attacks[attackId].timestamp_ended * 1000);

        const timeDifference = currentDate.getTime() - attackDate.getTime();
        const dayDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

        if (dayDifference > DAYS_SINCE_LAST_ATTACK_THRESHOLD) continue;

        const defenderId = attacks[attackId].defender_id;

        let defenderData;
        try {
            const userEndpoint = `https://api.torn.com/user/${defenderId}?selections=profile&key=${settings.api_key}`;
            defenderData = (await axios.get(userEndpoint)).data;
        } catch (err) {
            console.log("Can't get defender data");
        }

        let daysSinceLastActive;
        if (defenderData) {
            console.log(defenderData);
            try {
            const defenderLastActiveDate = new Date(defenderData.last_action.timestamp * 1000);
            const timeSinceLastActive = currentDate.getTime() - defenderLastActiveDate.getTime();
            daysSinceLastActive = Math.floor(timeSinceLastActive / (1000 * 3600 * 24));
            } catch (err) {
                console.log(`Invalid defender data for user ${defenderId}: ${JSON.stringify(defenderData)}`);
                continue;
            }
        }

        if (daysSinceLastActive < DAYS_SINCE_LAST_ACTIVE_THRESHOLD) {
            if (targets[defenderId]) {
                delete targets.defenderId;
            }

            continue;
        }
        
        let target = {
            name: attacks[attackId].defender_name,
            fairFight: attacks[attackId].modifiers.fair_fight,
            daysSinceLastAttack: dayDifference,
            daysSinceLastActive,
        }

        if (targets[defenderId]) {
            if (targets[defenderId].daysSinceLastAttack > target.daysSinceLastAttack) {
                targets[defenderId] = target;
            }
        } else {
            targets[defenderId] = target;
        }

        await sleep(500);
    }
    
    console.log(`************* FOUND ${Object.keys(targets).length} TARGETS *************`);
    console.log(targets);
    console.log(`************* SCRIPT FINISHED *************`);
}

getChainTargets();