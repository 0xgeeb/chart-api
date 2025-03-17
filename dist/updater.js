"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const axios_1 = __importDefault(require("axios"));
const cron_1 = require("cron");
const dotenv_1 = __importDefault(require("dotenv"));
const wagmi_1 = require("wagmi");
const viem_1 = require("viem");
const core_1 = require("@wagmi/core");
const Goldiswap_json_1 = __importDefault(require("./abis/Goldiswap.json"));
dotenv_1.default.config();
const PASSWORD = process.env.PASSWORD;
const BerachainMainnet = {
    id: 80094,
    name: "Berachain",
    nativeCurrency: {
        name: "BERA",
        symbol: "BERA",
        decimals: 18
    },
    rpcUrls: {
        default: {
            http: ["https://rpc.berachain.com/"],
        },
        public: {
            http: ["https://rpc.berachain.com/"],
        }
    }
};
exports.config = (0, wagmi_1.createConfig)({
    chains: [BerachainMainnet],
    ssr: true,
    transports: {
        [BerachainMainnet.id]: (0, wagmi_1.http)()
    }
});
const GOLDISWAP_ADDRESS = '0xb7E448E5677D212B8C8Da7D6312E8Afc49800466';
const DAILY_SECONDS = 86400;
const DAILY_BLOCKS = 28800;
const DAILY_LOOPS = 7;
const HOURLY_SECONDS = 3600;
const HOURLY_BLOCKS = 1200;
const HOURLY_LOOPS = 7;
const sleepPlz = (milliseconds = 400) => new Promise(resolve => setTimeout(resolve, milliseconds));
const floorPrice = (fsl, supply) => {
    return fsl / supply;
};
const marketPrice = (fsl, psl, supply) => {
    return floorPrice(fsl, supply) + (psl / supply) * ((psl + fsl) / fsl) ** 6;
};
const getLocksArray = (loops, blocks, seconds) => __awaiter(void 0, void 0, void 0, function* () {
    const client = (0, core_1.getPublicClient)(exports.config);
    const blockResult = yield client.getBlock();
    const currentBlock = parseFloat(blockResult.number);
    const currentTimestamp = parseFloat(blockResult.timestamp);
    console.log('block:', currentBlock, "timestamp:", currentTimestamp);
    const locksDailyArray = [];
    let incTimestamp = currentTimestamp;
    for (let i = currentBlock; i > (currentBlock - (loops * blocks)); i -= blocks) {
        const fslResult = yield (0, core_1.readContract)(exports.config, {
            address: GOLDISWAP_ADDRESS,
            abi: Goldiswap_json_1.default.abi,
            functionName: "fsl",
            args: [],
            blockNumber: i
        });
        const pslResult = yield (0, core_1.readContract)(exports.config, {
            address: GOLDISWAP_ADDRESS,
            abi: Goldiswap_json_1.default.abi,
            functionName: "psl",
            args: [],
            blockNumber: i
        });
        const supplyResult = yield (0, core_1.readContract)(exports.config, {
            address: GOLDISWAP_ADDRESS,
            abi: Goldiswap_json_1.default.abi,
            functionName: "totalSupply",
            args: [],
            blockNumber: i
        });
        const fsl = parseFloat((0, viem_1.formatEther)(fslResult));
        const psl = parseFloat((0, viem_1.formatEther)(pslResult));
        const supply = parseFloat((0, viem_1.formatEther)(supplyResult));
        const floor = floorPrice(fsl, supply);
        const market = marketPrice(fsl, psl, supply);
        const locksDailyEntry = {
            timestamp: incTimestamp,
            block: i,
            fsl,
            psl,
            supply,
            floor,
            market
        };
        locksDailyArray.push(locksDailyEntry);
        console.log(locksDailyEntry);
        incTimestamp -= seconds;
        yield sleepPlz();
    }
    console.log(locksDailyArray);
    return locksDailyArray;
});
const job = new cron_1.CronJob('0 */5 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const timestamp = new Date().toISOString();
        const dataToPost = {
            locksDaily: yield getLocksArray(DAILY_LOOPS, DAILY_BLOCKS, DAILY_SECONDS),
            locksHourly: yield getLocksArray(HOURLY_LOOPS, HOURLY_BLOCKS, HOURLY_SECONDS)
        };
        const response = yield axios_1.default.post(`http://localhost:${process.env.API_PORT}/updater`, {
            timestamp,
            data: dataToPost,
            password: PASSWORD
        });
        console.log('data posted successfully:', response.data);
    }
    catch (e) {
        console.error('error posting data: ', e);
    }
}));
job.start();
