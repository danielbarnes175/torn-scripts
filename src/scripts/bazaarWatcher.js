import axios from 'axios';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import table from 'text-table';
import settings from '../../settings.json' assert { type: "json" };
import sleep from '../helpers/sleep.js';
import items from '../config/items.js';
import addCommasToNumber from '../helpers/addCommasToNumber.js';
import handleError from '../helpers/handleError.js';

const webhookClient = new WebhookClient({ url: settings.bazaar_watcher_discord_webhook });

/**
 * Torn Script to ping every 10 seconds for bazaars with items listed at a cost lower than the threshold.
 */
async function watchBazaar() {
    while (true) {
        let itemsResponse;
        let bazaarResponse;
        try {
            const itemsEndpoint = `https://api.torn.com/torn/?selections=items&key=${settings.api_key}`;
            itemsResponse = await axios.get(itemsEndpoint);
            for (const item in items) {
                if (!items[item]['enabled']) continue;

                console.log(`\x1b[33m Checking ${(items[item]['name']).replaceAll('+', ' ')}... \x1b[0m`);
                const marketValue = itemsResponse.data.items[item]['market_value'];

                const bazaarEndpoint = `https://api.torn.com/market/${item}?selections=bazaar&key=${settings.api_key}`;
                bazaarResponse = await axios.get(bazaarEndpoint);
                const bazaars = bazaarResponse.data.bazaar;

                let totalPotentialProfit = 0;
                let quantityBelowMarketRate = 0;
                const itemsBelowMarketRate = [['Price', 'Quantity']];

                for (const bazaar of bazaars) {
                    if (bazaar.cost <= marketValue * items[item]['threshold']) {
                        quantityBelowMarketRate += bazaar.quantity;
                        totalPotentialProfit += (marketValue - bazaar.cost) * bazaar.quantity;
                        itemsBelowMarketRate.push([addCommasToNumber(bazaar.cost), bazaar.quantity]);
                    }
                }

                if (quantityBelowMarketRate > 0) {
                    console.log(`https://www.torn.com/imarket.php#/p=shop&step=shop&type=&searchname=${items[item]['name']}`);
                    console.log(`Current Market Value: ${marketValue}`);
                    console.log(`Quantity Below Market Rate: ${quantityBelowMarketRate}`);
                    console.log(`Potential Profit selling at ${marketValue}: ${totalPotentialProfit}`);

                    if (settings.bazaar_watcher_discord_webhook) {
                        const embed = new EmbedBuilder()
                            .setColor(0x0099FF)
                            .setTitle(`${(items[item]['name']).replaceAll('+', ' ')}`)
                            .setDescription(`https://www.torn.com/imarket.php#/p=shop&step=shop&type=&searchname=${items[item]['name']}`)
                            .addFields(
                                { name: 'Current Market Value', value: `${addCommasToNumber(marketValue)}` },
                                { name: 'Market', value: `${table(itemsBelowMarketRate, { align: [ 'l', 'r' ] })}` },
                                { name: 'Potential Profit', value: `${addCommasToNumber(totalPotentialProfit)}` },
                            );

                        webhookClient.send({ embeds: [embed] });
                    }
                }

                await sleep(200);
            }
            console.log('\x1b[33m Finished check... Resuming in 10 seconds... \x1b[0m');
            await sleep(10000);
        } catch (error) {
            console.log(error);

            if (itemsResponse.data.error || bazaarResponse.data.error) {
                console.log("Torn error received");
                const responseError = itemsResponse.data.error ? itemsResponse.data.error : bazaarResponse.data.error;
                handleError(responseError);
            } else {
                console.log("Non-torn error received");
            }
        }
    }
}

watchBazaar();