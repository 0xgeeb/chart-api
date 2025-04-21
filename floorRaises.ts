import dotenv from "dotenv"
import { createConfig, http } from "wagmi"
import { getPublicClient, readContract } from "@wagmi/core"
import { type Chain, formatEther, parseEther } from "viem"
import goldiswapABI from './abis/Goldiswap.json'

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

const step = 1000
let startBlock = 801949
const endBlock = 3174378

const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getFloorRaises = async () => {
  const floorRaises: { blockNumber: number, oldFloorPrice: number, newFloorPrice: number}[] = []
  let floorRaiseNum: number = 0
  let currentFloor: number = 0

  for(let i = startBlock; i < endBlock; i += step) {
    const currentFloorResponse = await readContract(config, {
      address: GOLDISWAP_ADDRESS,
      abi: goldiswapABI.abi,
      functionName: 'floorPrice',
      blockNumber: BigInt(i)
    })
    const newFloor = parseFloat(formatEther(currentFloorResponse as unknown as bigint))
    if(newFloor > currentFloor) {
      floorRaiseNum += 1
      const floorRaiseEntry = {
        blockNumber: i,
        oldFloorPrice: currentFloor,
        newFloorPrice: newFloor
      }
      floorRaises.push(floorRaiseEntry)
      console.log(`floor raise #${floorRaiseNum}: from ${currentFloor} to ${newFloor} at block ${i}`)
      currentFloor = newFloor
    }

    await sleep(400)
  }

  console.log(floorRaiseNum)
  console.log(floorRaises)
}

getFloorRaises()