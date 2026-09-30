import express from 'express'
import path from 'node:path'
import { createApp } from './app.js'

const app = createApp()
const port = Number(process.env.SERVER_PORT ?? 3001)
const publicDirectory = path.resolve(process.cwd(), 'dist')

app.use(express.static(publicDirectory))
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(publicDirectory, 'index.html'))
})

app.listen(port, () => {
  console.log(`The Movie Web server listening on http://localhost:${port}`)
})
