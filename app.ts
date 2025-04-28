import crypto from "crypto"
import dotenv from "dotenv"
import express, { Request, Response } from "express"

dotenv.config()
const app = express()
const port = process.env.API_PORT
app.use(express.json())
const PASSWORD = process.env.PASSWORD
if(!PASSWORD) {
  throw new Error('password not set')
}

type ChartData = {
  locksHourly: any[];
  locksDaily: any[];
  locksWeekly: any[];
  rusdytHourly: any[];
  rusdytDaily: any[];
  rusdytWeekly: any[];
  rsethytHourly: any[];
  rsethytDaily: any[];
  rsethytWeekly: any[];
  unibtcytHourly: any[];
  unibtcytDaily: any[];
  unibtcytWeekly: any[];
}

let chartData: ChartData = {
  locksHourly: [],
  locksDaily: [],
  locksWeekly: [],
  rusdytHourly: [],
  rusdytDaily: [],
  rusdytWeekly: [],
  rsethytHourly: [],
  rsethytDaily: [],
  rsethytWeekly: [],
  unibtcytHourly: [],
  unibtcytDaily: [],
  unibtcytWeekly: []
}

const setData = (data: any): boolean => {
  chartData = data
  return true
}

app.get("/lockschartdata", async (req: Request, res: Response) => {
  console.log('lockschartdata api request received')

  const jsonResponse = {
    locksHourly: chartData.locksHourly,
    locksDaily: chartData.locksDaily,
    locksWeekly: chartData.locksWeekly
  }
  res.json(jsonResponse)
})

app.get("/rusdytchartdata", async (req: Request, res: Response) => {
  console.log('rusdytchartdata api request received')

  const jsonResponse = {
    rusdytHourly: chartData.rusdytHourly,
    rusdytDaily: chartData.rusdytDaily,
    rusdytWeekly: chartData.rusdytWeekly
  }
  res.json(jsonResponse)
})

app.get("/rsethytchartdata", async (req: Request, res: Response) => {
  console.log('rsethytchartdata api request received')

  const jsonResponse = {
    rsethytHourly: chartData.rsethytHourly,
    rsethytDaily: chartData.rsethytDaily,
    rsethytWeekly: chartData.rsethytWeekly
  }
  res.json(jsonResponse)
})

app.get("/unibtcytchartdata", async (req: Request, res: Response) => {
  console.log('unibtcytchartdata api request received')

  const jsonResponse = {
    unibtcytHourly: chartData.unibtcytHourly,
    unibtcytDaily: chartData.unibtcytDaily,
    unibtcytWeekly: chartData.unibtcytWeekly
  }
  res.json(jsonResponse)
})

app.post('/updater', (req: Request, res: Response) => {
  const { payload, signature } = req.body
  console.log('updater request', payload, signature)

  if(!payload || !signature) {
    console.log('missing payload or signature')
    res.status(400).json({ message: "bad request"})
    return
  }

  const expectedSig = crypto
    .createHmac('sha256', PASSWORD)
    .update(payload)
    .digest('hex')
  if(expectedSig !== signature) {
    console.log('invalid signature')
    res.status(401).json({ message: "unauthorized" })
    return
  }

  const { data } = JSON.parse(payload)
  if (!data || typeof data !== 'object') {
    res.status(400).json({ message: "invalid data format" })
    return
  }

  const success = setData(data)
  if(success) {
    console.log('updated successfully')
    res.json({ message: "updated successfully"})
  }
  else {
    console.log('error updating')
    res.status(400).json({ message: "error updating"})
  }
})

app.listen(port, () => console.log(`Goldilocks Chart API is running on http://localhost:${port}`))