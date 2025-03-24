import dotenv from "dotenv"
import express, { Request, Response } from "express"

dotenv.config()
const app = express()
const port = process.env.API_PORT
app.use(express.json())

type ChartData = {
  locksDaily: any[];
  locksHourly: any[];
  rusdytDaily: any[];
  rusdytHourly: any[];
}

let chartData: ChartData = {
  locksDaily: [],
  locksHourly: [],
  rusdytDaily: [],
  rusdytHourly: []
}

const setData = (data: any): boolean => {
  chartData = data
  return true
}

app.get("/locksdaily", async (req: Request, res: Response) => {
  console.log('locksdaily api request received')
  
  const jsonResponse = {
    locksDaily: chartData.locksDaily
  }
  res.json(jsonResponse)
})

app.get("/lockshourly", async (req: Request, res: Response) => {
  console.log('lockshourly api request received')

  const jsonResponse = {
    locksHourly: chartData.locksHourly
  }
  res.json(jsonResponse)
})

app.get("/rusdytdaily", async (req: Request, res: Response) => {
  console.log('rusdytdaily api request received')

  const jsonResponse = {
    rusdytDaily: chartData.rusdytDaily
  }
  res.json(jsonResponse)
})

app.get("/rusdythourly", async (req: Request, res: Response) => {
  console.log('rusdythourly api request received')

  const jsonResponse = {
    rusdytHourly: chartData.rusdytHourly
  }
  res.json(jsonResponse)
})

app.post('/updater', (req: Request, res: Response) => {
  const { data, password } = req.body
  console.log('updater request', data, password)

  if(!data || typeof data !== 'object') {
    console.log('invalid data format')
    res.status(400).json({ message: "invalid data format"})
  }
  else if(password !== process.env.PASSWORD) {
    console.log('unauthorized')
    res.status(401).json({ message: "unauthorized"})
  }
  else {
    const success = setData(data)
    if(success) {
      console.log('updated successfully')
      res.json({ message: "updated successfully"})
    }
    else {
      console.log('error updating')
      res.status(400).json({ message: "error updating"})
    }
  }
})

app.listen(port, () => console.log(`Goldilocks Chart API is running on http://localhost:${port}`))