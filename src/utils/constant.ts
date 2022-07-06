import { utils } from 'ethers'

export const DECIMAL_PRECISION = 12
export const DECIMAL_PRECISION_IN_UNIT = utils.parseUnits(
  '1',
  DECIMAL_PRECISION
)
export const ROUNDED_NUMBER = 6