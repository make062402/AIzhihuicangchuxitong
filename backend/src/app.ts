import express, { Application } from 'express'
import cors from 'cors'
import compression from 'compression'
import 'express-async-errors'
import path from 'path'
import fs from 'fs'
import { env } from './config/env'
import './config/db'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { authRouter } from './modules/auth'
import { itemsRouter, locationsRouter } from './modules/items'
import { inboundRouter } from './modules/inbound'
import { outboundRouter } from './modules/outbound'
import { inventoryRouter } from './modules/inventory'
import { billingRouter } from './modules/billing'
import { usersRouter } from './modules/users'
import { alertsRouter } from './modules/alerts'
import { auditRouter } from './modules/audit'

export const createApp = (): Application => {
  const app = express()

  app.use(httpLogger)
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )
  app.use(express.json({ limit: '20mb' }))
  app.use(express.urlencoded({ extended: true, limit: '20mb' }))
  app.use(compression())

  app.use(env.API_PREFIX, systemRouter)
  app.use(`${env.API_PREFIX}/auth`, authRouter)
  app.use(`${env.API_PREFIX}/items`, itemsRouter)
  app.use(`${env.API_PREFIX}/locations`, locationsRouter)
  app.use(`${env.API_PREFIX}/inbound`, inboundRouter)
  app.use(`${env.API_PREFIX}/outbound`, outboundRouter)
  app.use(`${env.API_PREFIX}/inventory`, inventoryRouter)
  app.use(`${env.API_PREFIX}/billing`, billingRouter)
  app.use(`${env.API_PREFIX}/users`, usersRouter)
  app.use(`${env.API_PREFIX}/alerts`, alertsRouter)
  app.use(`${env.API_PREFIX}/audit`, auditRouter)

  // 生产环境同时托管前端静态文件（单容器部署）
  // 部署时将 frontend/dist 拷贝到 backend/public
  const publicDir = path.join(process.cwd(), 'public')
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { maxAge: '7d', index: false }))
    // 前端路由回退：非 API 请求全部交给 SPA
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
