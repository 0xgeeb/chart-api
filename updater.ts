import axios from "axios"
import { CronJob } from "cron"
import dotenv from "dotenv"
import { createConfig, http } from "wagmi"
import { formatEther, type Chain } from "viem"
import { getPublicClient, readContract } from "@wagmi/core"
import goldiswapABI from './abis/Goldiswap.json'

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

const getLocksArray = async (loops: number, blocks: number, seconds: number): Promise<any> => {
  const client = getPublicClient(config)
  const blockResult: any = await client.getBlock()
  const currentBlock = parseFloat(blockResult.number)
  const currentTimestamp = parseFloat(blockResult.timestamp)
  console.log('block:', currentBlock, "timestamp:", currentTimestamp)
  
  const locksDailyArray: any[] = []
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

    const locksDailyEntry = {
      timestamp: incTimestamp,
      block: i,
      fsl,
      psl,
      supply,
      floor,
      market
    }
    locksDailyArray.push(locksDailyEntry)
    console.log(locksDailyEntry)

    incTimestamp -= seconds
    await sleepPlz()
  }

  console.log(locksDailyArray)
  return locksDailyArray
}

const job = new CronJob('0 */5 * * * *', async () => { // Every 5 minutes
  try {
    const timestamp = new Date().toISOString()
    const dataToPost = { 
      locksDaily: await getLocksArray(DAILY_LOOPS, DAILY_BLOCKS, DAILY_SECONDS),
      locksHourly: await getLocksArray(HOURLY_LOOPS, HOURLY_BLOCKS, HOURLY_SECONDS)
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