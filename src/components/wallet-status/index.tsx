import React from 'react'
import {
  getAccount,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import './index.css'

export interface WalletStatusProps {
  callback: () => Promise<void>
}

export const WalletStatus = function ({ callback }: WalletStatusProps) {
  const [connected, setConnected] = React.useState(false)
  const [address, setAddress] = React.useState('')

  React.useEffect(() => {
    initState()
  })

  const initState = async () => {
    const account = await getAccount()
    setConnected(!!account)
    setAddress(account)
  }

  const connect = async () => {
    await switchToCorrectNetwork()
    const signer = await requestSigner()
    setAddress(await signer.getAddress())
    setConnected(true)
    await callback()
  }
  return (
    <div
      className={`wallet-info-container ${connected ? 'active' : ''}`}
      onClick={() => {
        !connected && connect()
      }}
    >
      {connected
        ? `Connected: ${address.substr(0, 6)}...${address.substr(
            address.length - 6,
            6
          )}`
        : 'Connect'}
    </div>
  )
}
