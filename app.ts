import dotenv from "dotenv"
import express, { Request, Response } from "express"
import { createConfig, http } from "wagmi"
import { formatEther, parseEther, type Chain } from "viem"
import { getPublicClient, readContract } from "@wagmi/core"
import goldiswapABI from './abis/Goldiswap.json'

dotenv.config()
const app = express()
const port = 3001
app.use(express.json())

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

const sleepPlz = (milliseconds: number = 500) => new Promise(resolve => setTimeout(resolve, milliseconds))

const floorPrice = (fsl: number, supply: number): number => {
  return fsl / supply
}

const marketPrice = (fsl: number, psl: number, supply: number): number => {
  return floorPrice(fsl, supply) + (psl / supply) * ((psl + fsl) / fsl) ** 6
}

app.get("/locksdaily", async (req: Request, res: Response) => {
  console.log('locksdaily api request received')
  
  const client = getPublicClient(config)
  const blockResult: any = await client.getBlock()
  const currentBlock = parseFloat(blockResult.number)
  const currentTimestamp = parseFloat(blockResult.timestamp)
  console.log('block:', currentBlock, "timestamp:", currentTimestamp)
  
  const locksDailyArray: any[] = []
  let incTimestamp = currentTimestamp
  for(let i = currentBlock; i > (currentBlock - (DAILY_LOOPS * DAILY_BLOCKS)); i -= DAILY_BLOCKS) {
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

    incTimestamp -= DAILY_SECONDS
    await sleepPlz()
  }
  const jsonResponse = {
    locksDaily: locksDailyArray
  }
  console.log(jsonResponse)
  res.json(jsonResponse)
})

app.listen(port, () => console.log(`Goldilocks Chart API is running on http://localhost:${port}`))