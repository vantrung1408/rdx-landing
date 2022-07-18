import React, { useEffect, useState } from 'react'
import './index.css'
import { Input } from '../input'
import { BigNumber } from 'bignumber.js'
import { decimalsCorrector, formatCurrency } from '../../utils/wallet'
import { Token } from '../../utils/type'
import { ROUNDED_NUMBER } from '../../utils/constant'

export interface AmountInputOnChangeProps {
  value?: number
  valid: boolean
  insufficient: boolean
}

export interface AmountInputProps {
  balance?: BigNumber
  decimals?: BigNumber
  token?: Token
  pair?: Token[]
  onChange: (props: AmountInputOnChangeProps, isUserTrigger: boolean) => any
  style?: any
  showBalanceInfo?: boolean
  renderBalanceInfo?: () => JSX.Element
  balanceInfoTitle?: string
  onTokenClick?: (token?: Token) => any
  [key: string]: any
}

export const AmountInput = function ({
  balance,
  token,
  onChange,
  decimals,
  style,
  showBalanceInfo,
  renderBalanceInfo,
  balanceInfoTitle,
  onTokenClick,
  pair,
  ...inputProps
}: AmountInputProps) {
  const percentage = [25, 50, 75, 100]
  const [value, setValue] = useState('')

  useEffect(() => {
    const parsedValue = [undefined, null].includes(inputProps.value)
      ? ''
      : inputProps.value
    if (parsedValue !== value) {
      onInputChange(
        {
          target: {
            value: parsedValue,
          },
        },
        true
      )
    }
  }, [inputProps.value])

  const onInputChange = (event: any, triggerFromEffect: boolean) => {
    const value = event.target.value
    const isNan = isNaN(parseFloat(value))
    if (!balance || isNan) {
      setValue(value)
      onChange(
        {
          value: value,
          valid: !isNan,
          insufficient: false,
        },
        !triggerFromEffect
      )
      return
    }
    if (!decimals) {
      decimals = new BigNumber(0)
    }
    const parsedValue = decimalsCorrector(value, decimals)
    const valid = !!value && balance.gte(parsedValue)
    const insufficient = balance.lt(parsedValue)
    setValue(value)
    onChange(
      {
        value: value,
        valid: valid,
        insufficient: insufficient,
      },
      !triggerFromEffect
    )
  }

  const changeByPercent = (percent: number) => {
    if (!balance || !decimals) {
      return
    }
    const value = balance
      .multipliedBy(percent)
      .div(100)
      .div(new BigNumber(10).pow(decimals))
      .toNumber()
    onInputChange(
      {
        target: {
          value: value,
        },
      },
      false
    )
  }

  const onKeyPress = (event: any) => {
    let charCode = event.which ? event.which : event.keyCode
    return !(
      charCode != 46 &&
      charCode > 31 &&
      (charCode < 48 || charCode > 57)
    )
  }

  const renderPair = () => {
    return (
      <div className='token-container'>
        {pair?.map((token, index) => (
          <div
            key={index}
            className='pair-container'
            onClick={() => {
              onTokenClick && onTokenClick(token)
            }}
          >
            {token?.logo && <img className='token-logo' src={token.logo} />}
            <label className='token-name'>{token?.name || '?'}</label>
            {index + 1 !== pair.length && (
              <label className='seperator'>/</label>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderToken = () => {
    return (
      <div
        className='token-container'
        onClick={() => {
          onTokenClick && onTokenClick(token)
        }}
      >
        {token?.logo && <img className='token-logo' src={token.logo} />}
        <label className='token-name'>{token?.name || '?'}</label>
      </div>
    )
  }

  const isAllPairSelected = () =>
    pair?.length && pair.every((token) => token.name)

  return (
    <div className='amount-input-container' style={style}>
      <div className='amount-input-content-container'>
        {pair && pair.length ? renderPair() : renderToken()}
        <Input
          {...inputProps}
          value={value}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          disabled={!token?.name && !isAllPairSelected()}
        />
      </div>
      {(token?.name || isAllPairSelected()) && (
        <div className='balance-info-container'>
          {showBalanceInfo && decimals ? (
            renderBalanceInfo ? (
              renderBalanceInfo()
            ) : (
              <label className='wallet-info'>
                {balanceInfoTitle || 'Balance'}:{' '}
                <label className='number'>
                  {balance ? formatCurrency(balance, decimals) : '-'}
                </label>{' '}
                {token?.name || pair?.map((token) => token.name).join(' / ')}
              </label>
            )
          ) : (
            <label />
          )}
          {balance?.gt(0) && (
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
      )}
    </div>
  )
}
