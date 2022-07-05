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
