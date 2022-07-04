import React from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import downArrowIcon from '../../img/down-arrow.png'
import { AmountInput, Button } from '../../components'
import { BigNumber } from 'ethers'
import './index.css'

export interface SwapProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Swap = (props: SwapProps) => {
  const [amount, setAmount] = React.useState('')
  const [info, setInfo] = React.useState(0)

  const swap = () => {}

  return (
    <div className='pool form-container'>
      <div className='form-content-container'>
        <div className='pool-amount-input'>
          <AmountInput
            balance={BigNumber.from(100000)}
            decimals={BigNumber.from(100000)}
            token={{ name: 'WETH', logo: ethIcon }}
            value={amount}
            placeholder='0.0'
            onChange={(value) => {}}
            style={{ marginBottom: 0 }}
            showBalanceInfo
          />
          <img className='arrow-icon' src={downArrowIcon} />
        </div>
        <AmountInput
          balance={BigNumber.from(100000)}
          decimals={BigNumber.from(100000)}
          token={{ name: 'USDC', logo: usdcIcon }}
          value={amount}
          placeholder='0.0'
          onChange={(value) => {}}
          showBalanceInfo
        />
        <div className='rate-container'>
          <label />
          <label className='rate-info'>
            <label className='number'>1</label> WETH ={' '}
            <label className='number'>1000</label> USDC
          </label>
        </div>
        <Button type='button' value='Swap' onClick={swap} disabled={true} />
      </div>
    </div>
  )
}
