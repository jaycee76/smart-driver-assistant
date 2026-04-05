import { getTollPoints, getExpressways } from '../utils/tollData'

export default defineEventHandler(() => {
  return {
    expressways: getExpressways(),
    tollPoints: getTollPoints().map(({ id, name, expressway }) => ({ id, name, expressway })),
  }
})
