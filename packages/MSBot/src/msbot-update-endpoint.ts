/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
// tslint:disable:no-console
// tslint:disable:no-object-literal-type-assertion
import { BotConfiguration, IEndpointService, ServiceTypes } from 'botframework-config';
import * as chalk from 'chalk';
import * as program from 'commander';
import * as getStdin from 'get-stdin';
import * as txtfile from 'read-text-file';
import * as validurl from 'valid-url';
import { uuidValidate } from './utils';

program.Command.prototype.unknownOption = (flag: string): void => {
    console.error(chalk.default.redBright(`[msbot] Unknown arguments: ${flag}`));
    showErrorHelp();
};

interface IEndpointArgs extends IEndpointService {
    bot: string;
    secret: string;
    stdin: boolean;
    input?: string;
}

program
    .name('msbot update endpoint')
    .description('update the bot to an endpoint')
    .option('-e, --endpoint <endpoint>', 'url for the endpoint\n')
    .option('-n, --name <name>', 'name of the endpoint')
    .option('-a, --appId  <appid>', '(OPTIONAL) Microsoft AppId used for auth with the endpoint')
    .option('-p, --appPassword <password>', '(OPTIONAL) Microsoft app password used for auth with the endpoint')

    .option('-b, --bot <path>', 'path to bot file.  If omitted, local folder will look for a .bot file')
    .option('--input <jsonfile>', 'path to arguments in JSON format { id:\'\',name:\'\', ... }')
    .option('--secret <secret>', 'bot file secret password for encrypting service secrets')
    .option('--stdin', 'arguments are passed in as JSON object via stdin')
    .action((cmd: program.Command, actions: program.Command) => undefined);

const command: program.Command = program.parse(process.argv);
const args: IEndpointArgs = <IEndpointArgs>{};
Object.assign(args, command);

if (process.argv.length < 3) {
    showErrorHelp();
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
    if (args.stdin) {
        Object.assign(args, JSON.parse(await getStdin()));
    } else if (args.input != null) {
        Object.assign(args, JSON.parse(await txtfile.read(<string>args.input)));
    }

    if (!args.endpoint) {
        throw new Error('missing --endpoint');
    }

    if (!validurl.isHttpUri(args.endpoint) && !validurl.isHttpsUri(args.endpoint)) {
        throw new Error(`--endpoint ${args.endpoint} is not a valid url`);
    }

    for (const service of config.services) {
        if (service.type === ServiceTypes.Endpoint) {
            const endpointService = <IEndpointService>service;
            if (endpointService.endpoint === args.endpoint) {
                if (args.hasOwnProperty('name')) {
                    endpointService.name = args.name;
                }
                if (args.appId && !uuidValidate(args.appId)) {
                    endpointService.appId = args.appId;
                }
                if (args.appPassword) {
                    endpointService.appPassword = args.appPassword;
                }
                await config.save(args.secret);
                process.stdout.write(JSON.stringify(endpointService, null, 2));
                return config;
            }
        }
    }
    throw new Error(`[msbot] Endpoint Service ${args.endpoint} was not found in the bot file`);
}

function showErrorHelp(): void {
    program.outputHelp((str: string) => {
        console.error(`[msbot] ${str}`);

        return '';
    });
    process.exit(1);
}
