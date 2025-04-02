import dotenv from "dotenv"
import { type Chain, createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { CronJob } from "cron"
import oriBGTABI from "./abis/oriBGT.json"
import iBGTABI from "./abis/iBGT.json"

dotenv.config()
const PRIVATE_KEY = process.env.PRIVATE_KEY

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

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

const client = createWalletClient({
  account,
  chain: BerachainMainnet,
  transport: http()
})

const MOCK_IBGT_ADDRESS = ''
const MOCK_ORIBGT_ADDRESS = ''

const deposit = async (): Promise<boolean> => {
  const [address] = await client.getAddresses()

  try {
    const mintHash = await client.writeContract({
      address: MOCK_IBGT_ADDRESS as `0x${string}`,
      abi: iBGTABI.abi,
      functionName: 'mint',
      args: [address, parseEther(`${10}`)],
      account: address
    })
    const approveHash = await client.writeContract({
      address: MOCK_IBGT_ADDRESS as `0x${string}`,
      abi: iBGTABI.abi,
      functionName: 'approve',
      args: [MOCK_ORIBGT_ADDRESS, parseEther(`${10}`)],
      account: address
    })
    const depositHash = await client.writeContract({
      address: MOCK_ORIBGT_ADDRESS as `0x${string}`,
      abi: oriBGTABI.abi,
      functionName: 'mint',
      args: [address, parseEther(`${10}`)],
      account: address
    })
    
    return true
  }
  catch (e) {
    console.log('oops', e)
    return false
  }
}

const job = new CronJob('0 * * * *', async () => { // every hour
  console.log('trying to deposit')
  const success = await deposit()
  if(success) {
    console.log('successfully deposited')
  }
  else {
    console.log('failed to deposit')
  }
})

job.start()