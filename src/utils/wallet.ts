import { ethers, Signer, BigNumber } from 'ethers'
import { BigNumber as BigNumberJS } from 'bignumber.js'
BigNumberJS.config({
  CRYPTO: true,
})

export const requestSigner = async (): Promise<Signer> => {
  const provider = new ethers.providers.Web3Provider(window.ethereum, 'any')
  await provider.send('eth_requestAccounts', [])
  const signer = provider.getSigner()
  return signer
}

export const formatCurrency = (value: BigNumber, decimals: BigNumber) => {
  const parsedValue = new BigNumberJS(value.toString())
  const parsedDecimals = new BigNumberJS(decimals.toString())
  return parsedValue.div(parsedDecimals).toFormat()
}
