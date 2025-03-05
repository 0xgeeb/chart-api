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
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const wagmi_1 = require("wagmi");
const core_1 = require("@wagmi/core");
const Goldiswap_json_1 = __importDefault(require("./abis/Goldiswap.json"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
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
const GOLDISWAP_ADDRESS = '';
app.get("/locksweekly", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('locksweely api request received');
    const fslResult = yield (0, core_1.readContract)(exports.config, {
        address: GOLDISWAP_ADDRESS,
        abi: Goldiswap_json_1.default.abi,
        functionName: "fsl",
        args: []
    });
    const pslResult = yield (0, core_1.readContract)(exports.config, {
        address: GOLDISWAP_ADDRESS,
        abi: Goldiswap_json_1.default.abi,
        functionName: "psl",
        args: []
    });
    const supplyResult = yield (0, core_1.readContract)(exports.config, {
        address: GOLDISWAP_ADDRESS,
        abi: Goldiswap_json_1.default.abi,
        functionName: "totalSupply",
        args: []
    });
    const locksWeeklyArray = [];
    const jsonResponse = {
        locksWeekly: locksWeeklyArray
    };
    console.log(jsonResponse);
    res.json(jsonResponse);
}));
app.listen(port, () => console.log(`Goldilocks Chart API is running on http://localhost:${port}`));
