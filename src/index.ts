import 'dotenv/config'
import app from './app.js'

const parsedPort = Number.parseInt(process.env.PORT ?? '', 10)
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort

app.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}`),
)
