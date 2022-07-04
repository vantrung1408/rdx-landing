import React from 'react'
import './index.css'
import { Input } from '../input'
import { BigNumber } from 'ethers'
import { BigNumber as BigNumberJS } from 'bignumber.js'

export interface Token {
  name: string
  logo?: string
}

export interface AmountInputProps {
  balance: BigNumber
  decimals: BigNumber
  token: Token
  onChange: (value: number) => any
  [key: string]: any
}

export const AmountInput = function ({
  balance,
  token,
  onChange,
  decimals,
  ...inputProps
}: AmountInputProps) {
  const percentage = [25, 50, 100]

  const onInputChange = (event: any) => {
    const value = event.target.value
    onChange(value)
  }

  const changeByPercent = (percent: number) => {
    const value = new BigNumberJS(balance.toString())
      .div(decimals.toString())
      .div(100)
      .multipliedBy(percent)
      .toNumber()
    onChange(value)
  }

  return (
    <div className='amount-input-container'>
      <div className='amount-input-content-container'>
        <div className='token-container'>
          {token.logo && <img className='token-logo' src={token.logo} />}
          <label className='token-name'>{token.name}</label>
        </div>
        <Input {...inputProps} onChange={onInputChange} />
      </div>
      {balance.gt(0) && (
        <div className='percentage-container'>
          {percentage.map((percent) => (
            <label
              key={percent}
              className='percent number'
              onClick={() => {
                changeByPercent(percent)
              }}
            >
              {percent === 100 ? 'Max' : `${percent}%`}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
