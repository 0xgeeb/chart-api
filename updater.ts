import axios from "axios"
import { CronJob } from "cron"
import dotenv from "dotenv"
import { createConfig, http } from "wagmi"
import { parseEther, formatEther, type Chain } from "viem"
import { getPublicClient, readContract } from "@wagmi/core"
import goldiswapABI from './abis/Goldiswap.json'
import quoterABI from './abis/QuoterV2.json'
import vaultABI from './abis/Goldivault4626.json'

dotenv.config()
const PASSWORD = process.env.PASSWORD

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
const RUSD_ADDRESS = '0x09D4214C03D01F49544C0448DBE3A27f768F2b34'
const RUSDOT_ADDRESS = '0x4A8B5283E053A8B118EaDc4981e8Ec8659995652'
const RUSDVAULT_ADDRESS = '0x8f65453BF050233d3BD6a08A5Eb53C1fD73312EC'
const QUOTER_ADDRESS = '0x644C8D6E501f7C994B74F5ceA96abe65d0BA662B'
const DAILY_SECONDS = 86400
const DAILY_BLOCKS = 28800
const DAILY_LOOPS = 7
const HOURLY_SECONDS = 3600
const HOURLY_BLOCKS = 1200
const HOURLY_LOOPS = 7

const sleepPlz = (milliseconds: number = 400) => new Promise(resolve => setTimeout(resolve, milliseconds))

const floorPrice = (fsl: number, supply: number): number => {
  return fsl / supply
}

const marketPrice = (fsl: number, psl: number, supply: number): number => {
  return floorPrice(fsl, supply) + (psl / supply) * ((psl + fsl) / fsl) ** 6
}

const getRusdYtArray = async (loops: number, blocks: number, seconds: number, daysTilInc: number): Promise<any> => {
  const client = getPublicClient(config)
  const blockResult: any = await client.getBlock()
  const currentBlock = parseFloat(blockResult.number)
  const currentTimestamp = parseFloat(blockResult.timestamp)
  console.log('block:', currentBlock, "timestamp:", currentTimestamp)

  const rusdytTempArray: any[] = []
  let incTimestamp = currentTimestamp
  let j = 0
  for(let i = currentBlock; i > (currentBlock - (loops * blocks)); i -= blocks) {
    const buyingOTQuoteResultRusd: any = await readContract(config, {
      address: QUOTER_ADDRESS,
      abi: quoterABI.abi,
      functionName: "quoteExactOutputSingle",
      args: [
        [
          RUSD_ADDRESS,
          RUSDOT_ADDRESS,
          parseEther(`1`),
          500,
          0
        ]
      ],
      blockNumber: i as unknown as bigint
    })
    const endTimeResultRusd: any = await readContract(config, {
      address: RUSDVAULT_ADDRESS,
      abi: vaultABI.abi,
      functionName: "endTime",
      args: [],
      blockNumber: i as unknown as bigint
    })
    const buyingOTPriceRusd = parseFloat(formatEther(buyingOTQuoteResultRusd[0] as unknown as bigint))
    const timeDifferenceRusd = parseFloat(endTimeResultRusd) * 1000 - Date.now()
    const fixedDaysDifferenceRusd = timeDifferenceRusd / (1000 * 60 * 60 * 24)
    const daysTilRusd = parseFloat(fixedDaysDifferenceRusd.toFixed(2)) + j
    const fixedAprResponseRusd = (1 - buyingOTPriceRusd) * 100 * (365 / daysTilRusd)
    const ytPriceRusd = 1 - buyingOTPriceRusd

    const rusdytTempEntry = {
      timestamp: incTimestamp,
      block: i,
      daysTil: daysTilRusd,
      ytPrice: ytPriceRusd,
      fixedApr: fixedAprResponseRusd
    }
    rusdytTempArray.push(rusdytTempEntry)
    console.log(rusdytTempEntry)

    incTimestamp -= seconds
    j += daysTilInc
    await sleepPlz()
  }

  console.log(rusdytTempArray)
  return rusdytTempArray
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
      locksDaily: await getLocksArray(DAILY_LOOPS, DAILY_BLOCKS, DAILY_SECONDS),
      locksHourly: await getLocksArray(HOURLY_LOOPS, HOURLY_BLOCKS, HOURLY_SECONDS),
      rusdytDaily: await getRusdYtArray(DAILY_LOOPS, DAILY_BLOCKS, DAILY_SECONDS, 1),
      rusdytHourly: await getRusdYtArray(HOURLY_LOOPS, HOURLY_BLOCKS, HOURLY_SECONDS, 1/24)
    }
    const response = await axios.post(`http://localhost:${process.env.API_PORT}/updater`, {
      timestamp,
      data: dataToPost,
      password: PASSWORD
    })
    console.log('data posted successfully:', response.data)
  }
  catch (e) {
    console.error('error posting data: ', e)
  }
})

job.start()