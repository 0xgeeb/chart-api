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
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.API_PORT;
app.use(express_1.default.json());
let chartData = { locksDaily: [], locksHourly: [] };
const setData = (data) => {
    chartData = data;
    return true;
};
app.get("/locksdaily", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('locksdaily api request received');
    const jsonResponse = {
        locksDaily: chartData.locksDaily
    };
    res.json(jsonResponse);
}));
app.get("/lockshourly", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('lockshourly api request received');
    const jsonResponse = {
        locksHourly: chartData.locksHourly
    };
    res.json(jsonResponse);
}));
app.post('/updater', (req, res) => {
    const { data, password } = req.body;
    console.log('updater request', data, password);
    if (!data || typeof data !== 'object') {
        console.log('invalid data format');
        res.status(400).json({ message: "invalid data format" });
    }
    else if (password !== process.env.PASSWORD) {
        console.log('unauthorized');
        res.status(401).json({ message: "unauthorized" });
    }
    else {
        const success = setData(data);
        if (success) {
            console.log('updated successfully');
            res.json({ message: "updated successfully" });
        }
        else {
            console.log('error updating');
            res.status(400).json({ message: "error updating" });
        }
    }
});
app.listen(port, () => console.log(`Goldilocks Chart API is running on http://localhost:${port}`));
