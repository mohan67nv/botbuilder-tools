/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
// tslint:disable:no-console
// tslint:disable:no-object-literal-type-assertion
import { BotConfiguration, IGenericService, ServiceTypes } from 'botframework-config';
import * as chalk from 'chalk';
import * as program from 'commander';

program.Command.prototype.unknownOption = (flag: string): void => {
    console.error(chalk.default.redBright(`[msbot] Unknown arguments: ${flag}`));
    showErrorHelp();
};

interface IGenericArgs extends IGenericService {
    bot: string;
    secret: string;
    stdin: boolean;
    input?: string;
    keys: string;
}

program
    .name('msbot connect generic')
    .description('Connect a generic service to the bot')
    .option('-n, --name <name>', 'name of the service')
    .option('-u, --url <url>', 'deep link url for the service\n')
    .option('--keys <keys>', 'serialized json key/value configuration for the service')

    .option('-b, --bot <path>', 'path to bot file.  If omitted, local folder will look for a .bot file')
    .option('--input <jsonfile>', 'path to arguments in JSON format { id:\'\',name:\'\', ... }')
    .option('--secret <secret>', 'bot file secret password for encrypting service secrets')
    .option('--stdin', 'arguments are passed in as JSON object via stdin')
    .action((filePath: program.Command, actions: program.Command) => {
        if (filePath) {
            actions.filePath = filePath;
        }
    });

const command: program.Command = program.parse(process.argv);
const args: IGenericArgs = <IGenericArgs>{};
Object.assign(args, command);

if (process.argv.length < 3) {
    program.help();
} else {
    if (!args.bot) {
        BotConfiguration.loadBotFromFolder(process.cwd(), args.secret)
            .then(processArgs)
            .catch((reason: Error) => {
                console.error(chalk.default.redBright(`[msbot] ${reason.toString().split('\n')[0]}`));
                showErrorHelp();
            });
    } else {
        BotConfiguration.load(args.bot, args.secret)
            .then(processArgs)
            .catch((reason: Error) => {
                console.error(chalk.default.redBright(`[msbot] ${reason.toString().split('\n')[0]}`));
                showErrorHelp();
            });
    }
}

async function processArgs(config: BotConfiguration): Promise<BotConfiguration> {
    if (!args.url) {
        throw new Error('mising --url');
    }

    for (const service of config.services) {
        if (service.type === ServiceTypes.Generic) {
            const genericService = <IGenericService>service;
            if (genericService.url === args.url) {
                if (args.hasOwnProperty('name')) {
                    genericService.name = args.name;
                }
                if (args.keys) {
                    genericService.configuration = JSON.parse(args.keys);
                    await config.save(args.secret);
                    process.stdout.write(JSON.stringify(genericService, null, 2));
                    return config;
                }
            }
        }
    }
    throw new Error(`[msbot] Generic Service ${args.url} was not found in the bot file`);
}

function showErrorHelp(): void {
    program.outputHelp((str: string) => {
        console.error(`[msbot] ${str}`);

        return '';
    });
    process.exit(1);
}
