import crypto from "crypto"
import axios from "axios"
import { CronJob } from "cron"
import dotenv from "dotenv"
import { createConfig, http } from "wagmi"
import { parseEther, formatEther, parseUnits, formatUnits, type Chain } from "viem"
import { getPublicClient, readContract } from "@wagmi/core"
import goldiswapABI from './abis/Goldiswap.json'
import quoterABI from './abis/QuoterV2.json'
import vaultABI from './abis/Goldivault4626.json'

dotenv.config()
const PASSWORD = process.env.PASSWORD
if(!PASSWORD) {
  throw new Error('password not set')
}

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
} as const satisfies Chain

export const config = createConfig({
  chains: [BerachainMainnet],
  ssr: true,
  transports: {
    [BerachainMainnet.id]: http()
  }
})

const GOLDISWAP_ADDRESS = '0xb7E448E5677D212B8C8Da7D6312E8Afc49800466'
const QUOTER_ADDRESS = '0x644C8D6E501f7C994B74F5ceA96abe65d0BA662B'
const RUSD_ADDRESS = '0x09D4214C03D01F49544C0448DBE3A27f768F2b34'
const RUSDOT_ADDRESS = '0x4A8B5283E053A8B118EaDc4981e8Ec8659995652'
const RUSDVAULT_ADDRESS = '0x8f65453BF050233d3BD6a08A5Eb53C1fD73312EC'
const UNIBTC_ADDRESS = '0xC3827A4BC8224ee2D116637023b124CED6db6e90'
const UNIBTCOT_ADDRESS = '0xE771779B350d2cC291E9461387d7f41765a7cB8b'
const UNIBTCVAULT_ADDRESS = '0x8742DB52a4EAEFE88bE5D3431980E221aaAA1EE3'
const RSETH_ADDRESS = '0x4186BFC76E2E237523CBC30FD220FE055156b41F'
const RSETHOT_ADDRESS = '0xB1195a6cdB7ef8fB22671bd8321727dBB6DDDe03'
const RSETHVAULT_ADDRESS = '0xE4dC8142CEd52C547384032e43379b0514341c22'
const SOLVBTC_ADDRESS = '0xCC0966D8418d412c599A6421b760a847eB169A8c'
const SOLVBTCOT_ADDRESS = '0xA01cB564ecc3F58a4e2bA5fD59d13a6b998de9b8'
const SOLVBTCVAULT_ADDRESS = '0xe2f6eF50fD232c7c9698F2f4CaE44A6D80AaFdEE'
const ORIBGT_ADDRESS = '0x69f1E971257419B1E9C405A553f252c64A29A30a'
const ORIBGTOT_ADDRESS = '0x978448A7866Aed0146Ad5C5E5d3d8424e2b16356'
const ORIBGTVAULT_ADDRESS = '0x66090e34c9192Ee9927f44f978246be3e5365D36'
const DAILY_SECONDS = 86400
const DAILY_BLOCKS = 28800
const DAILY_LOOPS = 7
const HOURLY_SECONDS = 3600
const HOURLY_BLOCKS = 1200
const HOURLY_LOOPS = 7
const WEEKLY_SECONDS = 604800
const WEEKLY_BLOCKS = 201600
const WEEKLY_LOOPS = 7

const sleepPlz = (milliseconds: number = 400) => new Promise(resolve => setTimeout(resolve, milliseconds))

const floorPrice = (fsl: number, supply: number): number => {
  return fsl / supply
}

const marketPrice = (fsl: number, psl: number, supply: number): number => {
  return floorPrice(fsl, supply) + (psl / supply) * ((psl + fsl) / fsl) ** 6
}

const getYtArray = async (
  loops: number,
  blocks: number,
  seconds: number,
  daysTilInc: number,
  dtAddy: string,
  otAddy: string,
  vaultAddy: string,
  eighteenDecimals: boolean
): Promise<any> => {
  const client = getPublicClient(config)
  const blockResult: any = await client.getBlock()
  const currentBlock = parseFloat(blockResult.number)
  const currentTimestamp = parseFloat(blockResult.timestamp)
  console.log('block:', currentBlock, "timestamp:", currentTimestamp)

  const ytTempArray: any[] = []
  let incTimestamp = currentTimestamp
  let j = 0
  for(let i = currentBlock; i > (currentBlock - (loops * blocks)); i -= blocks) {
    const buyingOTQuoteResult: any = await readContract(config, {
      address: QUOTER_ADDRESS,
      abi: quoterABI.abi,
      functionName: "quoteExactOutputSingle",
      args: [
        [
          dtAddy,
          otAddy,
          eighteenDecimals ? parseEther(`1`) : parseUnits(`1`, 8),
          500,
          0
        ]
      ],
      blockNumber: i as unknown as bigint
    })
    const endTimeResult: any = await readContract(config, {
      address: vaultAddy as `0x${string}`,
      abi: vaultABI.abi,
      functionName: "endTime",
      args: [],
      blockNumber: i as unknown as bigint
    })
    const buyingOTPrice = eighteenDecimals ? parseFloat(formatEther(buyingOTQuoteResult[0] as unknown as bigint)) : parseFloat(formatUnits(buyingOTQuoteResult[0] as unknown as bigint, 8))
    const timeDifference = parseFloat(endTimeResult) * 1000 - Date.now()
    const fixedDaysDifference = timeDifference / (1000 * 60 * 60 * 24)
    const daysTil = parseFloat(fixedDaysDifference.toFixed(2)) + j
    const fixedAprResponse = (1 - buyingOTPrice) * 100 * (365 / daysTil)
    const ytPrice = 1 - buyingOTPrice

    const ytTempEntry = {
      timestamp: incTimestamp,
      block: i,
      daysTil: daysTil,
      ytPrice: ytPrice,
      fixedApr: fixedAprResponse
    }
    ytTempArray.push(ytTempEntry)
    console.log(ytTempEntry)

    incTimestamp -= seconds
    j += daysTilInc
    await sleepPlz()
  }

  console.log(ytTempArray)
  return ytTempArray
}

const getSolvbtcYtArray = async (
  loops: number,
  blocks: number,
  seconds: number,
  daysTilInc: number,
  dtAddy: string,
  otAddy: string,
  vaultAddy: string
): Promise<any> => {
  const client = getPublicClient(config)
  const blockResult: any = await client.getBlock()
  const currentBlock = parseFloat(blockResult.number)
  const currentTimestamp = parseFloat(blockResult.timestamp)
  console.log('block:', currentBlock, "timestamp:", currentTimestamp)

  const ytTempArray: any[] = []
  let incTimestamp = currentTimestamp
  let j = 0
  for(let i = currentBlock; i > (currentBlock - (loops * blocks)); i -= blocks) {
    const buyingOTQuoteResult: any = await readContract(config, {
      address: QUOTER_ADDRESS,
      abi: quoterABI.abi,
      functionName: "quoteExactOutputSingle",
      args: [
        [
          dtAddy,
          otAddy,
          parseEther(`0.0001`),
          500,
          0
        ]
      ],
      blockNumber: i as unknown as bigint
    })
    const endTimeResult: any = await readContract(config, {
      address: vaultAddy as `0x${string}`,
      abi: vaultABI.abi,
      functionName: "endTime",
      args: [],
      blockNumber: i as unknown as bigint
    })
    const buyingOTPrice = parseFloat(formatEther(buyingOTQuoteResult[0] as unknown as bigint)) * 10000
    const timeDifference = parseFloat(endTimeResult) * 1000 - Date.now()
    const fixedDaysDifference = timeDifference / (1000 * 60 * 60 * 24)
    const daysTil = parseFloat(fixedDaysDifference.toFixed(2)) + j
    const fixedAprResponse = (1 - buyingOTPrice) * 100 * (365 / daysTil)
    const ytPrice = 1 - buyingOTPrice

    const ytTempEntry = {
      timestamp: incTimestamp,
      block: i,
      daysTil: daysTil,
      ytPrice: ytPrice,
      fixedApr: fixedAprResponse
    }
    ytTempArray.push(ytTempEntry)
    console.log(ytTempEntry)

    incTimestamp -= seconds
    j += daysTilInc
    await sleepPlz()
  }

  console.log(ytTempArray)
  return ytTempArray
}

const getLocksArray = async (loops: number, blocks: number, seconds: number): Promise<any> => {
  const client = getPublicClient(config)
  const blockResult: any = await client.getBlock()
  const currentBlock = parseFloat(blockResult.number)
  const currentTimestamp = parseFloat(blockResult.timestamp)
  console.log('block:', currentBlock, "timestamp:", currentTimestamp)
  
  const locksTempArray: any[] = []
  let incTimestamp = currentTimestamp
  for(let i = currentBlock; i > (currentBlock - (loops * blocks)); i -= blocks) {
    const fslResult: any = await readContract(config, {
      address: GOLDISWAP_ADDRESS as `0x${string}`,
      abi: goldiswapABI.abi,
      functionName: "fsl",
      args: [],
      blockNumber: i as unknown as bigint
    })
    const pslResult: any = await readContract(config, {
      address: GOLDISWAP_ADDRESS as `0x${string}`,
      abi: goldiswapABI.abi,
      functionName: "psl",
      args: [],
      blockNumber: i as unknown as bigint
    })
    const supplyResult: any = await readContract(config, {
      address: GOLDISWAP_ADDRESS as `0x${string}`,
      abi: goldiswapABI.abi,
      functionName: "totalSupply",
      args: [],
      blockNumber: i as unknown as bigint
    })
    const fsl = parseFloat(formatEther(fslResult))
    const psl = parseFloat(formatEther(pslResult))
    const supply = parseFloat(formatEther(supplyResult))
    const floor = floorPrice(fsl, supply)
    const market = marketPrice(fsl, psl, supply)

    const locksTempEntry = {
      timestamp: incTimestamp,
      block: i,
      fsl,
      psl,
      supply,
      floor,
      market
    }
    locksTempArray.push(locksTempEntry)
    console.log(locksTempEntry)

    incTimestamp -= seconds
    await sleepPlz()
  }

  console.log(locksTempArray)
  return locksTempArray
}

const job = new CronJob('0 */5 * * * *', async () => { // Every 5 minutes
  try {
    const timestamp = new Date().toISOString()
    const dataToPost = { 
      locksHourly: await getLocksArray(HOURLY_LOOPS, HOURLY_BLOCKS, HOURLY_SECONDS),
      locksDaily: await getLocksArray(DAILY_LOOPS, DAILY_BLOCKS, DAILY_SECONDS),
      locksWeekly: await getLocksArray(WEEKLY_LOOPS, WEEKLY_BLOCKS, WEEKLY_SECONDS),
      rusdytHourly: await getYtArray(
        HOURLY_LOOPS,
        HOURLY_BLOCKS,
        HOURLY_SECONDS,
        1/24,
        RUSD_ADDRESS,
        RUSDOT_ADDRESS,
        RUSDVAULT_ADDRESS,
        true
      ),
      rusdytDaily: await getYtArray(
        DAILY_LOOPS,
        DAILY_BLOCKS,
        DAILY_SECONDS,
        1,
        RUSD_ADDRESS,
        RUSDOT_ADDRESS,
        RUSDVAULT_ADDRESS,
        true
      ),
      rusdytWeekly: await getYtArray(
        WEEKLY_LOOPS,
        WEEKLY_BLOCKS,
        WEEKLY_SECONDS,
        7,
        RUSD_ADDRESS,
        RUSDOT_ADDRESS,
        RUSDVAULT_ADDRESS,
        true
      ),
      rsethytHourly: await getYtArray(
        HOURLY_LOOPS,
        HOURLY_BLOCKS,
        HOURLY_SECONDS,
        1/24,
        RSETH_ADDRESS,
        RSETHOT_ADDRESS,
        RSETHVAULT_ADDRESS,
        true
      ),
      rsethytDaily: await getYtArray(
        DAILY_LOOPS,
        DAILY_BLOCKS,
        DAILY_SECONDS,
        1,
        RSETH_ADDRESS,
        RSETHOT_ADDRESS,
        RSETHVAULT_ADDRESS,
        true
      ),
      rsethytWeekly: await getYtArray(
        WEEKLY_LOOPS,
        WEEKLY_BLOCKS,
        WEEKLY_SECONDS,
        7,
        RSETH_ADDRESS,
        RSETHOT_ADDRESS,
        RSETHVAULT_ADDRESS,
        true
      ),
      unibtcHourly: [],
      unibtcDaily: [],
      unibtcWeekly: [],
      // unibtcytHourly: await getYtArray(
      //   HOURLY_LOOPS,
      //   HOURLY_BLOCKS,
      //   HOURLY_SECONDS,
      //   1/24,
      //   UNIBTC_ADDRESS,
      //   UNIBTCOT_ADDRESS,
      //   UNIBTCVAULT_ADDRESS,
      //   false
      // ),
      // unibtcytDaily: await getYtArray(
      //   DAILY_LOOPS,
      //   DAILY_BLOCKS,
      //   DAILY_SECONDS,
      //   1,
      //   UNIBTC_ADDRESS,
      //   UNIBTCOT_ADDRESS,
      //   UNIBTCVAULT_ADDRESS,
      //   false
      // ),
      // unibtcytWeekly: await getYtArray(
      //   WEEKLY_LOOPS,
      //   WEEKLY_BLOCKS,
      //   WEEKLY_SECONDS,
      //   7,
      //   UNIBTC_ADDRESS,
      //   UNIBTCOT_ADDRESS,
      //   UNIBTCVAULT_ADDRESS,
      //   false
      // ),
      solvbtcHourly: [],
      solvbtcDaily: [],
      solvbtcWeekly: [],
      // solvbtcytHourly: await getSolvbtcYtArray(
      //   HOURLY_LOOPS,
      //   HOURLY_BLOCKS,
      //   HOURLY_SECONDS,
      //   1/24,
      //   SOLVBTC_ADDRESS,
      //   SOLVBTCOT_ADDRESS,
      //   SOLVBTCVAULT_ADDRESS
      // ),
      // solvbtcytDaily: await getSolvbtcYtArray(
      //   DAILY_LOOPS,
      //   DAILY_BLOCKS,
      //   DAILY_SECONDS,
      //   1,
      //   SOLVBTC_ADDRESS,
      //   SOLVBTCOT_ADDRESS,
      //   SOLVBTCVAULT_ADDRESS
      // ),
      // solvbtcytWeekly: await getSolvbtcYtArray(
      //   WEEKLY_LOOPS,
      //   WEEKLY_BLOCKS,
      //   WEEKLY_SECONDS,
      //   7,
      //   SOLVBTC_ADDRESS,
      //   SOLVBTCOT_ADDRESS,
      //   SOLVBTCVAULT_ADDRESS
      // ),
      oribgtytHourly: await getYtArray(
        HOURLY_LOOPS,
        HOURLY_BLOCKS,
        HOURLY_SECONDS,
        1/24,
        ORIBGT_ADDRESS,
        ORIBGTOT_ADDRESS,
        ORIBGTVAULT_ADDRESS,
        true
      ),
      oribgtytDaily: await getYtArray(
        DAILY_LOOPS,
        DAILY_BLOCKS,
        DAILY_SECONDS,
        1,
        ORIBGT_ADDRESS,
        ORIBGTOT_ADDRESS,
        ORIBGTVAULT_ADDRESS,
        true
      ),
      // oribgtytWeekly: await getYtArray(
      //   WEEKLY_LOOPS,
      //   WEEKLY_BLOCKS,
      //   WEEKLY_SECONDS,
      //   7,
      //   ORIBGT_ADDRESS,
      //   ORIBGTOT_ADDRESS,
      //   ORIBGTVAULT_ADDRESS,
      //   true
      // ),
    }
    const payload = JSON.stringify({ timestamp, data: dataToPost })
    const signature = crypto
      .createHmac('sha256', PASSWORD)
      .update(payload)
      .digest('hex')
    const response = await axios.post(`http://localhost:${process.env.API_PORT}/updater`, {
      payload,
      signature
    })
    console.log('data posted successfully:', response.data)
  }
  catch (e) {
    console.error('error posting data: ', e)
  }
})

job.start()