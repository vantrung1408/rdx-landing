import { ethers, Signer } from 'ethers'
import { BigNumber } from 'bignumber.js'
import { ROUNDED_NUMBER } from './constant'
import { ERC20_ABI, FACTORY, ROUTERV2 } from '../contracts'

export const requestSigner = async (): Promise<Signer> => {
  const provider = new ethers.providers.Web3Provider(window.ethereum, 'any')
  await provider.send('eth_requestAccounts', [])
  const signer = provider.getSigner()
  return signer
}

export const formatCurrency = (
  value: BigNumber.Value,
  decimals: BigNumber.Value
) => {
  if (!decimals) {
    return value.toString()
  }
  const parsedDecimals = new BigNumber(decimals)
  if (parsedDecimals.eq(0)) {
    return '-'
  }
  const parsedValue = new BigNumber(value)
  return parsedValue
    .div(new BigNumber(10).pow(parsedDecimals))
    .decimalPlaces(ROUNDED_NUMBER)
    .toFormat()
}

export const switchToCorrectNetwork = async () => {
  try {
    const chainId = process.env.REACT_APP_CHAIN_ID
    if (window.ethereum.chainId !== chainId) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId }], // chainId must be in hexadecimal numbers
      })
    }
  } catch {}
}

export const getAccount = async () => {
  const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  return accounts?.length ? accounts[0] : undefined
}

export const decimalsCorrector = (
  value: BigNumber.Value,
  decimals: BigNumber.Value
) => {
  return new BigNumber(value).multipliedBy(new BigNumber(10).pow(decimals))
}

export const getRouter = async () => {
  const signer = await requestSigner()
  const router = new ethers.Contract(ROUTERV2.address, ROUTERV2.abi, signer)
  return router
}

export const getTokenContract = async (address: string) => {
  const signer = await requestSigner()
  const contract = new ethers.Contract(address, ERC20_ABI, signer)
  return contract
}

export const getPairAddress = async (
  tokenAAddress: string,
  tokenBAddress: string
) => {
  const signer = await requestSigner()
  const router = await getRouter()
  const factoryAddress = await router.factory()
  const factory = new ethers.Contract(factoryAddress, FACTORY.abi, signer)
  const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress)
  return pairAddress
}
